import { SubscriptionCard } from "./part-a/SubscriptionCard";
import { BuyBox } from "./part-b/BuyBox";

const part = new URLSearchParams(window.location.search).get("part") === "b" ? "b" : "a";

export function App() {
  return (
    <>
      <nav className="flex gap-4 px-4 py-2 font-sans text-[13px]">
        <a className="underline underline-offset-[3px]" href="?part=a&fixture=active">Part A: Subscription page</a>
        <a className="underline underline-offset-[3px]" href="?part=b">Part B: Buy box</a>
      </nav>
      {part === "a" ? <SubscriptionCard /> : <BuyBox />}
    </>
  );
}
