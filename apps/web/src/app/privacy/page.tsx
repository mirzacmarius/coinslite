import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Privacy policy · CoinsLite" };

export default function Page() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="Draft, to be completed before launch"
    >
      <p>
        This is a placeholder. The full privacy policy will describe what
        CoinsLite stores about you and your collection, why, for how long, who
        processes it on our behalf, and how to export or delete it.
      </p>
      <p>
        Until then: we store your account details (email, display name, language
        and Home currency) and what you record in your Collection, only to run
        the service. We don't sell your data or show ads. You can delete your
        account and everything in it at any time.
      </p>
    </LegalPage>
  );
}
