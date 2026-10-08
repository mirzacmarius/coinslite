import { GoogleSignin } from "@/components/google-signin";

export const metadata = {
  title: "Login",
};

export default function Page() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center size-96">
        <h1 className="mb-8 text-3xl font-medium">CoinsLite</h1>
        <GoogleSignin />
      </div>
    </div>
  );
}
