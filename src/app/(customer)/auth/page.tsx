import { Suspense } from "react";
import AuthForm from "./auth-form";

export default function AuthPage() {
  return (
    <Suspense fallback={<p className="py-8 text-center text-sm">Loading...</p>}>
      <AuthForm />
    </Suspense>
  );
}
