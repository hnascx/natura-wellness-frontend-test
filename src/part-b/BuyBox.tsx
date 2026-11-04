import { useState } from "react";
import { copy } from "./copy";

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function BuyBox() {
  const [purchaseType, setPurchaseType] = useState<"one-time" | "subscribe">("subscribe");
  const [frequency, setFrequency] = useState(copy.subscribe.frequencyOptions[0]);
  const [quantity, setQuantity] = useState(1);
  const isSubscription = purchaseType === "subscribe";
  const unitPrice = isSubscription ? copy.subscribe.priceCents : copy.oneTime.priceCents;
  const oneTimeTotal = copy.oneTime.priceCents * quantity;
  const subscriptionTotal = copy.subscribe.priceCents * quantity;
  const subscriptionCompareTotal = copy.subscribe.comparePriceCents * quantity;
  const finePrint = copy.finePrint.replace("30 days", frequency).replace("$25.46", formatPrice(subscriptionTotal));

  return (
    <main className="min-h-screen bg-[#fbf9f5] px-5 py-10 text-[#1d2924] lg:h-[calc(100vh-36px)] lg:min-h-0 lg:overflow-hidden lg:px-16 lg:py-6">
      <section className="mx-auto grid max-w-[1072px] items-start gap-12 lg:grid-cols-[540px_minmax(0,1fr)] lg:gap-16">
        <div className="flex min-h-[430px] items-center justify-center overflow-hidden rounded-[2rem] border border-[#e3ddd2] bg-white p-8 lg:h-[570px] lg:min-h-[570px] lg:rounded-[1.25rem] lg:p-2">
          <img alt="Vitamin D bottle" className="max-h-[490px] w-full max-w-[540px] object-contain lg:max-h-[570px]" src="/product.jpg" />
        </div>

        <section className="min-w-0 max-w-[760px]">
          <p className="text-xs font-medium tracking-[0.2em] text-[#748078]">{copy.eyebrow.toUpperCase()}</p>
          <div className="mt-3 flex items-center gap-2 text-base"><span aria-label="5 out of 5 stars" className="flex gap-0.5 text-[#d99a2b]">{Array.from({ length: 5 }, (_, index) => <Star key={index} />)}</span><span className="font-normal">{copy.rating}</span><span className="font-light text-[#7b8981] underline underline-offset-4">{copy.reviewCount}</span></div>
          <h1 className="mt-4 font-display text-[3.25rem] font-normal leading-none tracking-[-0.005em] text-[#164a38]">{copy.title}</h1>
          <p className="mt-5 max-w-[440px] text-base font-normal leading-[1.45] text-[#5a655f]">{copy.subtitle}</p>
          <div className="mb-6 mt-8 border-t border-[#e2dbcf]" />

          <div className="grid gap-3">
            <PurchaseOption checked={!isSubscription} label={copy.oneTime.label} onChange={() => setPurchaseType("one-time")} price={formatPrice(oneTimeTotal)} />
            <label className={`min-w-0 max-w-full cursor-pointer rounded-2xl border bg-[#f4f7f2] px-5 py-4 transition-colors hover:border-[#174b39] hover:bg-[#f8faf7] ${isSubscription ? "border-[2px] border-[#174b39]" : "border-[#ded8cd]"}`}>
              <span className="flex items-center gap-2.5"><input checked={isSubscription} className="sr-only" name="purchase-type" onChange={() => setPurchaseType("subscribe")} type="radio" /><Radio checked={isSubscription} /><span className="whitespace-nowrap text-base font-medium">{copy.subscribe.label}</span><span className="hidden whitespace-nowrap rounded-full bg-[#f8e9bc] px-[10px] py-[3px] text-[10px] font-bold tracking-[0.1em] text-[#805d16] sm:inline-flex">{copy.subscribe.badge.toUpperCase()}</span><span className="ml-auto shrink-0 text-right leading-none"><span className="block text-lg font-medium">{formatPrice(subscriptionTotal)}</span><span className="mt-0 block text-[13px] text-[#a4aca6] line-through">{formatPrice(subscriptionCompareTotal)}</span></span></span>
              <span className="ml-7 mt-2 inline-flex whitespace-nowrap rounded-full bg-[#f8e9bc] px-[10px] py-[3px] text-[10px] font-bold tracking-[0.1em] text-[#805d16] sm:hidden">{copy.subscribe.badge.toUpperCase()}</span>
              {isSubscription ? <><div className="mt-3 flex items-center gap-3 pl-7 text-sm text-[#5a655f]"><span className="font-light text-[#1d2924]">{copy.subscribe.frequencyLabel}</span><span className="relative"><select aria-label="Delivery frequency" className="w-[111px] cursor-pointer appearance-none rounded-lg border border-[#cdd4cd] bg-white py-1.5 pl-3 pr-8 font-medium text-[#1d2924] outline-none focus:ring-2 focus:ring-[#174b39] focus:ring-offset-1" onChange={(event) => setFrequency(event.target.value)} value={frequency}>{copy.subscribe.frequencyOptions.map((option) => <option key={option}>{option}</option>)}</select><span aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-1.5 w-1.5 -translate-y-2/3 rotate-45 border-b border-r border-[#1d2924]" /></span></div><ul className="mt-[13px] grid gap-2 pl-7 text-sm text-[#526159]">{copy.subscribe.perks.map((perk) => <li className="flex items-center gap-1.5" key={perk}><CheckMark />{perk}</li>)}</ul></> : null}
            </label>
          </div>

          <div className="mt-6 flex gap-3"><div aria-label="Quantity" className="flex w-24 cursor-pointer items-center justify-between rounded-xl border border-[#cfd6d0] bg-white px-3 py-3 text-lg font-medium sm:w-32 sm:px-4"><button aria-label="Decrease quantity" className="cursor-pointer font-normal disabled:cursor-not-allowed disabled:opacity-40" disabled={quantity === 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} type="button">−</button><span>{quantity}</span><button aria-label="Increase quantity" className="cursor-pointer font-normal" onClick={() => setQuantity((value) => value + 1)} type="button">+</button></div><button className="min-w-0 flex-1 cursor-pointer whitespace-nowrap rounded-xl bg-[#174b39] px-4 py-3 text-base font-medium text-white transition-colors hover:bg-[#123d2f] sm:px-5" type="button">{copy.addToCart} <span className="mx-2 text-[#a5b9af]">·</span> {formatPrice(unitPrice * quantity)}</button></div>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-[#526159]">{copy.trust.map((item) => <li className="flex items-center gap-2" key={item}><CheckCircle />{item}</li>)}</ul>
          {isSubscription ? <p className="mt-5 text-xs leading-relaxed text-[#7b8981]">{finePrint}</p> : null}
        </section>
      </section>
    </main>
  );
}

function Radio({ checked }: { checked: boolean }) {
  return <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${checked ? "border-[#174b39]" : "border-[#a7b0aa]"}`}><span className={checked ? "h-2.5 w-2.5 rounded-full bg-[#174b39]" : ""} /></span>;
}

function PurchaseOption({ checked, label, onChange, price }: { checked: boolean; label: string; onChange: () => void; price: string }) {
  return <label className={`flex min-w-0 min-h-[60px] max-w-full cursor-pointer items-center gap-3 rounded-2xl border bg-white px-5 py-4 transition-colors hover:border-[#174b39] hover:bg-[#f8faf7] ${checked ? "border-[#174b39] ring-1 ring-[#174b39]" : "border-[#ded8cd]"}`}><input checked={checked} className="sr-only" name="purchase-type" onChange={onChange} type="radio" /><Radio checked={checked} /><span className="flex-1 text-base font-medium">{label}</span><span className="text-lg font-medium">{price}</span></label>;
}

function CheckMark() {
  return <svg aria-hidden="true" className="h-4 w-4 shrink-0 stroke-[#174b39]" fill="none" strokeWidth="2" viewBox="0 0 16 16"><path d="m3 8 3 3 7-7" /></svg>;
}

function Star() {
  return <svg aria-hidden="true" className="h-[17px] w-[17px] shrink-0 fill-current" viewBox="0 0 16 16"><path d="m8 1.15 2.05 4.17 4.6.67-3.33 3.25.79 4.59L8 11.68l-4.11 2.15.79-4.59L1.35 5.99l4.6-.67L8 1.15Z" /></svg>;
}

function CheckCircle() {
  return <svg aria-hidden="true" className="h-4 w-4 shrink-0 stroke-[#174b39]" fill="none" strokeWidth="1.5" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2" /><path d="m5.5 8 1.5 1.6 3.5-3.6" /></svg>;
}
