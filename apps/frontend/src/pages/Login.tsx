import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LoginDto } from "@finance-tracker/shared";
import { useAuth } from "../contexts/AuthContext";
import { ApiError } from "../lib/api";
import { loginRequest } from "../lib/auth-api";
import { validateDto } from "../lib/validate-dto";
import type { FieldErrors } from "../lib/validate-dto";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FormAlert } from "../components/ui/FormAlert";
import { Input } from "../components/ui/Input";

interface LocationState {
  from?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LoginDto>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = (location.state as LocationState | null)?.from ?? "/dashboard";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const dto = Object.assign(new LoginDto(), { email, password });
    const errors = await validateDto(dto);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      const response = await loginRequest({ email, password });
      login(response.accessToken, response.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "เข้าสู่ระบบไม่สำเร็จ";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-md animate-[fadeIn_300ms_ease-out]">
        <header className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-extrabold text-zinc-100">
            Finance Tracker
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            เข้าสู่ระบบเพื่อจัดการรายรับรายจ่ายของคุณ
          </p>
        </header>

        <Card className="p-6 sm:p-8">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <h2 className="font-heading text-xl font-bold text-zinc-100">
              เข้าสู่ระบบ
            </h2>

            {formError ? <FormAlert>{formError}</FormAlert> : null}

            <Input
              label="อีเมล"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              required
            />

            <Input
              label="รหัสผ่าน"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              required
            />

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              เข้าสู่ระบบ
            </Button>

            <p className="text-center text-sm text-zinc-400">
              ยังไม่มีบัญชี?{" "}
              <Link
                to="/register"
                className="font-semibold text-emerald-400 hover:text-emerald-300"
              >
                สมัครสมาชิก
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
}
