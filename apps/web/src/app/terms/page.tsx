import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Terms of use · CoinsLite" };

export default function Page() {
  return (
    <LegalPage
      title="Terms of use"
      updated="Draft, to be completed before launch"
    >
      <p>
        This is a placeholder. The full terms will cover your account, the Free
        plan and Premium, payments and cancellation, acceptable use, and our
        responsibilities.
      </p>
      <p>
        Values such as Market value and Metal value are estimates to help you
        keep track of your collection, not valuations or financial advice.
      </p>
    </LegalPage>
  );
}
