# Natura Wellness frontend test

Frontend implementation for the Natura Wellness technical test. The original brief is available in [`INSTRUCTIONS.md`](./INSTRUCTIONS.md).

## Requirements

- Node.js 20+
- npm

## Run locally

```bash
npm install
npm run dev
```

Vite prints the local URL when the server starts (normally `http://localhost:5173`).

## Routes

| Area | Local route | Purpose |
| --- | --- | --- |
| Part A | `/?part=a&fixture=active` | Subscription-management experience |
| Part B | `/?part=b` | Product buy box rebuilt from the provided reference |

### Part A fixtures

Part A uses a local mock API. Switch fixture states with `fixture`:

- `active` — active subscription (default)
- `paused` — paused subscription
- `cancelled` — cancelled subscription
- `error` — request error state

Append `&conflict=always` to the active route to demonstrate optimistic-concurrency recovery after a subscription change, for example:

```text
http://localhost:5173/?part=a&fixture=active&conflict=always
```

The cancellation journey offers a delayed shipment for excess product, a temporary pause for cost concerns, and direct cancellation for the remaining reasons. Delay, pause, and cancellation are simulated in local UI state and reset after a page reload. Modals support keyboard focus management, Escape, a close button, and backdrop dismissal when a request is not pending.

## Interaction behavior

### Part A — Manage subscription

- The active view shows the next order, discounted total, cadence, and subscribed product.
- **Skip next shipment** is the only action that calls the mock API. Confirming moves the next charge forward by one billing interval and updates the card with the returned API state.
- If a skip request fails for a non-conflict reason, the confirmation dialog remains open with a retryable error message.
- If the API reports an optimistic-concurrency conflict, the page explains that the subscription changed elsewhere and provides **Reload subscription** to fetch the latest details before another attempt.
- **Cancel subscription** starts with a reason selector:
  - **I have too much product** offers a 30-, 60-, or 90-day shipment delay, applied locally after confirmation.
  - **It costs too much** offers a 30-, 60-, or 90-day subscription pause, applied locally after confirmation.
  - **I’m trying a different product**, **I didn’t see results**, and **Other** lead directly to cancellation confirmation.
  - **Other** optionally accepts additional written feedback.
- Paused and cancelled fixtures show distinct status cards and do not expose the skip action.

### Part B — Product buy box

- Customers can switch between a one-time purchase and a subscription. Quantity updates every displayed price, including option prices, subscription compare price, CTA total, and subscription fine print.
- Subscription customers can choose a 30-, 60-, or 90-day delivery frequency. The selected cadence is reflected in the subscription fine print.
- Quantity starts at one. The decrease control is disabled at the minimum; increasing quantity updates the displayed price and CTA amount.
- **Add to cart** is intentionally presentation-only for this exercise and does not make a backend request.

## Design resources

Part B matches [`public/reference/buy-box.png`](./public/reference/buy-box.png), a 2× screenshot of a 1200 px-wide browser window. Its source copy lives in [`src/part-b/copy.ts`](./src/part-b/copy.ts), while the provided product image is served from `public/product.jpg`.

Purchase type, delivery frequency, and quantity are local interactive state. **Add to cart** is intentionally visual only and does not call a backend.

## Verify

```bash
npm run build
```

This command runs the TypeScript check and generates a production build.
