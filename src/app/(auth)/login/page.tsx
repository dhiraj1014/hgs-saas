import { Suspense } from "react";
import { LoginForm } from "@/components/staff/login-form";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
