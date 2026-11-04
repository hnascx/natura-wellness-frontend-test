export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

export type CancellationReason = "too-much" | "too-expensive" | "different-product" | "no-results" | "other";
export type RetentionReason = "too-much" | "too-expensive";

export interface RetentionOffer {
  title: string;
  description: string;
}

export function getRetentionOffer(reason: RetentionReason): RetentionOffer {
  const offers: Record<RetentionReason, RetentionOffer> = {
    "too-much": { title: "Delay next shipment", description: "Choose how long to move only your next delivery and charge." },
    "too-expensive": { title: "Pause subscription", description: "Choose how long to take a break from charges and deliveries." },
  };

  return offers[reason];
}
