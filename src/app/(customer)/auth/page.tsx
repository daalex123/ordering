import { Suspense } from "react";
import AuthForm from "./auth-form";

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center text-[14px] text-white/50">Loading...</p>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
