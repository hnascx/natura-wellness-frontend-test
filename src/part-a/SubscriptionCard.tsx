import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { getSubscription, getSubscriptionSnapshot, skipNextShipment } from "../api/mockApi";
import { ApiError, type Subscription } from "../api/types";
import { formatCurrency, formatDate, getRetentionOffer, type CancellationReason, type RetentionReason } from "./subscriptionUtils";

export function SubscriptionCard() {
  const [{ subscription: initialSubscription, loading: initiallyLoading }] = useState(() => {
    const snapshot = getSubscriptionSnapshot();
    return { subscription: snapshot, loading: snapshot === null };
  });
  const [subscription, setSubscription] = useState<Subscription | null>(initialSubscription);
  const [error, setError] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(initiallyLoading);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipSuccess, setSkipSuccess] = useState("");
  const [skipConflict, setSkipConflict] = useState(false);
  const [isApplyingRetention, setIsApplyingRetention] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState<CancellationReason | null>(null);
  const [selectedDuration, setSelectedDuration] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const skipTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelTriggerRef = useRef<HTMLButtonElement>(null);
  const firstReasonRef = useRef<HTMLButtonElement>(null);
  const hasSubscriptionRef = useRef(initialSubscription !== null);
  const [skipError, setSkipError] = useState(false);

  const closeSkipDialog = () => {
    if (isSkipping) return;
    dismissSkipDialog();
  };

  const dismissSkipDialog = () => {
    setShowSkipDialog(false);
    requestAnimationFrame(() => skipTriggerRef.current?.focus());
  };

  const closeCancellationDialog = () => {
    if (isApplyingRetention) return;
    setShowCancelDialog(false);
    setCancellationReason(null);
    requestAnimationFrame(() => cancelTriggerRef.current?.focus());
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showSkipDialog) closeSkipDialog();
      else if (showCancelDialog) closeCancellationDialog();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isApplyingRetention, isSkipping, showCancelDialog, showSkipDialog]);

  const loadSubscription = useCallback(async () => {
    setError(false);
    if (!hasSubscriptionRef.current) setIsInitialLoading(true);

    try {
      setSubscription(await getSubscription());
      hasSubscriptionRef.current = true;
    } catch {
      setError(true);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  useEffect(() => {
    if (showCancelDialog && !cancellationReason) firstReasonRef.current?.focus();
  }, [cancellationReason, showCancelDialog]);

  if (!subscription && isInitialLoading) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-36px)] max-w-md items-center px-5 py-12 lg:mx-0">
        <section aria-live="polite" className="w-full rounded-[var(--nw-card-radius)] border border-[var(--nw-border)] bg-[var(--nw-surface)] p-6 text-center">
          <p className="font-display text-2xl font-normal text-[var(--nw-ink)]">Loading your subscription…</p>
          <p className="mt-2 text-sm leading-6 text-[var(--nw-muted)]">Getting your latest delivery details.</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-36px)] max-w-md items-center px-5 py-12 lg:mx-0">
        <section className="w-full rounded-[var(--nw-card-radius)] border border-[#e4cfc7] bg-[#fff8f5] p-6 text-center" role="alert">
          <p className="font-display text-2xl font-normal text-[var(--nw-ink)]">We couldn’t load your subscription.</p>
          <p className="mt-2 text-sm leading-6 text-[var(--nw-muted)]">Please check your connection and try again.</p>
          <button
            className="mt-5 cursor-pointer rounded-xl bg-[var(--nw-green)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#123d2f]"
            onClick={() => void loadSubscription()}
            type="button"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (!subscription) return null;

  if (subscription.status === "paused") {
    return (
      <SubscriptionStatusCard
        detail={`Paused until ${formatDate(subscription.pausedUntil!)}`}
        eyebrow="SUBSCRIPTION PAUSED"
        message="Your deliveries and charges are on hold. We’ll let you know before your subscription resumes."
      />
    );
  }

  if (subscription.status === "cancelled") {
    return (
      <SubscriptionStatusCard
        detail={`Cancelled on ${formatDate(subscription.cancelledAt!)}`}
        eyebrow="SUBSCRIPTION CANCELLED"
        message="There are no upcoming charges or deliveries on this subscription."
      />
    );
  }

  const nextChargeDate = subscription.nextChargeAt ? formatDate(subscription.nextChargeAt) : "Not scheduled";
  const nextChargeTotal = subscription.nextChargeTotalCents === null ? "—" : formatCurrency(subscription.nextChargeTotalCents);
  const usesDirectCancellation = cancellationReason === "different-product" || cancellationReason === "no-results" || cancellationReason === "other";

  const confirmSkip = async () => {
    setIsSkipping(true);
    setSkipConflict(false);
    setSkipError(false);

    try {
      const updatedSubscription = await skipNextShipment({
        subscriptionId: subscription.id,
        expectedUpdatedAt: subscription.updatedAt,
      });
      setSubscription(updatedSubscription);
      setSkipSuccess(`Next shipment moved to ${formatDate(updatedSubscription.nextChargeAt!)}.`);
      dismissSkipDialog();
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 409) {
        setSkipConflict(true);
        dismissSkipDialog();
      } else setSkipError(true);
    } finally {
      setIsSkipping(false);
    }
  };

  const applyRetention = (days: number) => {
    if (!cancellationReason) return;

    setIsApplyingRetention(true);
    setSkipConflict(false);
    setSkipSuccess("");
    const updatedAt = new Date().toISOString();
    if (cancellationReason === "too-much" && subscription.nextChargeAt) {
      const nextChargeAt = new Date(Date.parse(subscription.nextChargeAt) + days * 24 * 60 * 60 * 1000).toISOString();
      setSubscription({ ...subscription, nextChargeAt, updatedAt });
      setSkipSuccess(`Next shipment moved to ${formatDate(nextChargeAt)}.`);
    } else if (cancellationReason === "too-expensive") {
      const pausedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      setSubscription({ ...subscription, status: "paused", pausedUntil, nextChargeAt: null, nextChargeTotalCents: null, updatedAt });
    }
    closeCancellationDialog();
    setIsApplyingRetention(false);
  };

  return (
    <main className="min-h-[calc(100vh-36px)] bg-[var(--nw-page)] px-5 py-8 sm:px-8">
      <section className="mx-auto max-w-md lg:mx-0">
        <p className="text-xs font-medium tracking-[0.2em] text-[var(--nw-soft-muted)]">NATURA WELLNESS</p>
        <h1 className="mt-3 font-display text-4xl font-normal tracking-[-0.02em] text-[var(--nw-green)]">Your subscription</h1>
        <p className="mt-3 text-base leading-7 text-[var(--nw-muted)]">Everything you need for your next wellness delivery.</p>

        <section className="mt-7 overflow-hidden rounded-[var(--nw-card-radius)] border border-[var(--nw-border)] bg-[var(--nw-surface)]">
          <div className="bg-[var(--nw-green)] px-6 py-5 text-white">
            <p className="text-xs font-medium tracking-[0.18em] text-[#dce8e1]">NEXT ORDER</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <p className="font-display text-2xl font-normal">{nextChargeDate}</p>
              <p className="text-xl font-medium">{nextChargeTotal}</p>
            </div>
            <p className="mt-2 text-sm text-[#dce8e1]">Every {subscription.intervalDays} days · {subscription.discountPercent}% subscription savings</p>
          </div>

          <div className="p-6">
            <h2 className="text-xs font-medium tracking-[0.18em] text-[var(--nw-soft-muted)]">IN YOUR NEXT DELIVERY</h2>
            <ul className="mt-4 divide-y divide-[#eee9df]">
              {subscription.items.map((item) => (
                <li className="flex items-center gap-4 py-4 first:pt-0 last:pb-0" key={item.sku}>
                  {item.imageUrl ? (
                    <img alt="" className="h-12 w-12 rounded-xl bg-[#f4f7f2] object-contain" src={item.imageUrl} />
                  ) : (
                    <div aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f4f7f2] text-lg text-[var(--nw-green)]">✦</div>
                  )}
                  <p className="font-medium text-[var(--nw-ink)]">{item.name} × {item.quantity}</p>
                </li>
              ))}
            </ul>
            {skipSuccess ? <p className="mt-6 rounded-xl border border-[#d8e4dc] bg-[#f4f7f2] p-4 text-sm font-medium text-[var(--nw-green)]" role="status">{skipSuccess}</p> : null}
            {skipConflict ? (
              <div className="mt-6 rounded-xl border border-[#e7d6a5] bg-[#fff9e8] p-4 text-sm text-[var(--nw-ink)]" role="alert">
                <p className="font-semibold">Your subscription changed elsewhere.</p>
                <p className="mt-1">Reload the latest details before trying again.</p>
                <button className="mt-3 cursor-pointer font-medium underline underline-offset-4" onClick={() => { setSkipConflict(false); void loadSubscription(); }} type="button">Reload subscription</button>
              </div>
            ) : null}
            <button className="mt-6 w-full cursor-pointer rounded-xl border border-[var(--nw-green)] px-5 py-3 text-sm font-medium text-[var(--nw-green)] transition-colors hover:bg-[#f4f7f2]" onClick={() => setShowSkipDialog(true)} ref={skipTriggerRef} type="button">
              Skip next shipment
            </button>
            <button className="mt-4 w-full cursor-pointer text-sm font-medium text-[var(--nw-muted)] underline underline-offset-4" onClick={() => { setCancellationReason(null); setSelectedDuration(""); setShowCancelDialog(true); }} ref={cancelTriggerRef} type="button">Cancel subscription</button>
          </div>
        </section>

        {showSkipDialog ? (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-[#1d2924]/45 p-4 backdrop-blur-sm" onClick={closeSkipDialog} role="presentation">
            <section aria-labelledby="skip-title" aria-modal="true" className="relative w-full max-w-md rounded-[var(--nw-card-radius)] border border-[var(--nw-border)] bg-[var(--nw-surface)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()} onKeyDown={trapFocus} role="dialog">
              <button aria-label="Close dialog" className="absolute right-4 top-4 cursor-pointer text-xl font-light leading-none text-[var(--nw-muted)] transition-colors hover:text-[var(--nw-green)]" disabled={isSkipping} onClick={closeSkipDialog} type="button">×</button>
              <h2 className="font-display text-2xl font-normal text-[var(--nw-green)]" id="skip-title">Skip this delivery?</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--nw-muted)]">Your next charge will move to the following delivery cycle.</p>
              {skipError ? <p className="mt-4 rounded-xl border border-[#e4cfc7] bg-[#fff8f5] p-3 text-sm leading-6 text-[var(--nw-ink)]" role="alert">We couldn’t skip this shipment. Please try again.</p> : null}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button autoFocus className="cursor-pointer rounded-xl bg-[var(--nw-green)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#123d2f] disabled:cursor-not-allowed disabled:opacity-60" disabled={isSkipping} onClick={() => void confirmSkip()} type="button">
                  {isSkipping ? "Skipping shipment…" : "Yes, skip shipment"}
                </button>
                <button className="cursor-pointer rounded-xl border border-[var(--nw-border)] px-4 py-3 text-sm font-medium text-[var(--nw-ink)] transition-colors hover:bg-[#f4f7f2] disabled:cursor-not-allowed disabled:opacity-60" disabled={isSkipping} onClick={closeSkipDialog} type="button">Keep shipment</button>
              </div>
            </section>
          </div>
        ) : null}
        {showCancelDialog ? (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-[#1d2924]/45 p-4 backdrop-blur-sm" onClick={closeCancellationDialog} role="presentation">
            <section aria-label="Cancellation options" aria-modal="true" className="relative w-full max-w-md rounded-[var(--nw-card-radius)] border border-[var(--nw-border)] bg-[var(--nw-surface)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()} onKeyDown={trapFocus} role="dialog">
              <button aria-label="Close dialog" className="absolute right-4 top-4 cursor-pointer text-xl font-light leading-none text-[var(--nw-muted)] transition-colors hover:text-[var(--nw-green)]" disabled={isApplyingRetention} onClick={closeCancellationDialog} type="button">×</button>
              {!cancellationReason ? <>
                <h2 className="font-display text-2xl font-normal text-[var(--nw-green)]">Before you cancel</h2>
                <p className="mt-2 text-sm text-[var(--nw-muted)]">What is the main reason?</p>
                <div className="mt-5 grid gap-2">
                  {[["too-much", "I have too much product"], ["too-expensive", "It costs too much"], ["different-product", "I’m trying a different product"], ["no-results", "I didn’t see results"], ["other", "Other"]].map(([value, label], index) => <button className="cursor-pointer rounded-xl border border-[var(--nw-border)] bg-[var(--nw-surface)] p-3 text-left text-sm font-medium text-[var(--nw-ink)] transition-colors hover:border-[var(--nw-green)] hover:bg-[#f4f7f2]" key={value} onClick={() => { setSelectedDuration(""); setCancellationReason(value as CancellationReason); }} ref={index === 0 ? firstReasonRef : undefined} type="button">{label}</button>)}
                </div>
              </> : <>
                {usesDirectCancellation ? <>
                  <h2 className="font-display text-2xl font-normal text-[var(--nw-green)]">Cancel subscription?</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--nw-muted)]">Your subscription will stop and you won’t receive future charges or deliveries.</p>
                  {cancellationReason === "other" ? <label className="mt-5 block text-sm font-medium text-[var(--nw-muted)]">Tell us more (optional)<textarea className="mt-2 w-full rounded-xl border border-[var(--nw-border)] p-3 font-normal text-[var(--nw-ink)] outline-none focus:ring-2 focus:ring-[var(--nw-green)] focus:ring-offset-1" onChange={(event) => setOtherReason(event.target.value)} value={otherReason} /></label> : null}
                  <button className="mt-6 w-full cursor-pointer rounded-xl bg-[var(--nw-green)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#123d2f]" onClick={() => setSubscription({ ...subscription, status: "cancelled", cancelledAt: new Date().toISOString(), nextChargeAt: null, nextChargeTotalCents: null })} type="button">Yes, cancel subscription</button>
                  <button className="mt-4 w-full cursor-pointer text-sm font-medium text-[var(--nw-muted)] underline underline-offset-4" onClick={closeCancellationDialog} type="button">Keep subscription</button>
                </> : <>
                  <h2 className="font-display text-2xl font-normal text-[var(--nw-green)]">{getRetentionOffer(cancellationReason as RetentionReason).title}</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--nw-muted)]">{getRetentionOffer(cancellationReason as RetentionReason).description}</p>
                  <label className="mt-6 block text-sm font-medium text-[var(--nw-muted)]">
                    Duration
                    <span className="relative mt-2 block">
                      <select className="w-full cursor-pointer appearance-none rounded-lg border border-[#cdd4cd] bg-white py-1.5 pl-3 pr-8 font-medium text-[var(--nw-ink)] outline-none focus:ring-2 focus:ring-[var(--nw-green)] focus:ring-offset-1 disabled:cursor-not-allowed" disabled={isApplyingRetention} onChange={(event) => setSelectedDuration(event.target.value)} value={selectedDuration}>
                        <option value="">Select a duration</option>
                        {[30, 60, 90].map((days) => <option key={days} value={days}>{days} days</option>)}
                      </select>
                      <span aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 border-b border-r border-[#1d2924]" />
                    </span>
                  </label>
                  <button className="mt-4 w-full cursor-pointer rounded-xl bg-[var(--nw-green)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#123d2f] disabled:cursor-not-allowed disabled:opacity-60" disabled={isApplyingRetention || !selectedDuration} onClick={() => void applyRetention(Number(selectedDuration))} type="button">
                    {isApplyingRetention ? "Updating subscription…" : cancellationReason === "too-much" ? "Delay shipment" : "Pause subscription"}
                  </button>
                </>}
                {!usesDirectCancellation ? <button className="mt-4 w-full cursor-pointer text-sm font-medium text-[var(--nw-muted)] underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50" disabled={isApplyingRetention} onClick={() => setSubscription({ ...subscription, status: "cancelled", cancelledAt: new Date().toISOString(), nextChargeAt: null, nextChargeTotalCents: null })} type="button">Continue to cancel</button> : null}
              </>}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function trapFocus(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const focusable = event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), a[href]");
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function SubscriptionStatusCard({
  detail,
  eyebrow,
  message,
}: {
  detail: string;
  eyebrow: string;
  message: string;
}) {
  return (
    <main className="min-h-[calc(100vh-36px)] bg-[var(--nw-page)] px-5 py-8 sm:px-8">
      <section className="mx-auto max-w-md lg:mx-0">
        <p className="text-xs font-medium tracking-[0.2em] text-[var(--nw-soft-muted)]">NATURA WELLNESS</p>
        <h1 className="mt-3 font-display text-4xl font-normal tracking-[-0.02em] text-[var(--nw-green)]">Your subscription</h1>
        <section className="mt-7 rounded-[var(--nw-card-radius)] border border-[var(--nw-border)] bg-[var(--nw-surface)] p-6">
          <p className="text-xs font-medium tracking-[0.18em] text-[var(--nw-soft-muted)]">{eyebrow}</p>
          <p className="mt-3 font-display text-2xl font-normal text-[var(--nw-ink)]">{detail}</p>
          <p className="mt-4 text-base leading-7 text-[var(--nw-muted)]">{message}</p>
        </section>
      </section>
    </main>
  );
}
