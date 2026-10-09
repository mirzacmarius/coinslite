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
    </LegalPage>
  );
}
