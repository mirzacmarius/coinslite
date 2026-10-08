import { GoogleSignin } from "@/components/google-signin";
import { LanguageMenu } from "@/components/preferences";
import { getScopedI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getScopedI18n("login");
  return { title: t("title") };
}

export default async function Page() {
  const t = await getScopedI18n("login");

  return (
    <div className="relative h-screen w-screen flex flex-col items-center justify-center">
      <div className="absolute right-4 top-4">
        <LanguageMenu />
      </div>
      <div className="flex flex-col items-center justify-center gap-6 size-96">
        <h1 className="text-3xl font-medium">CoinsLite</h1>
        <p className="text-sm text-muted-foreground">{t("tagline")}</p>
        <GoogleSignin label={t("continueWithGoogle")} />
      </div>
    </div>
  );
}
