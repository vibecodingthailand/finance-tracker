import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { RegisterDto } from "@finance-tracker/shared";
import { ApiError } from "../lib/api";
import { registerRequest } from "../lib/auth-api";
import { validateDto } from "../lib/validate-dto";
import type { FieldErrors } from "../lib/validate-dto";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FormAlert } from "../components/ui/FormAlert";
import { Input } from "../components/ui/Input";
import { Logo } from "../components/ui/Logo";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegisterDto>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const dto = Object.assign(new RegisterDto(), { name, email, password });
    const errors = await validateDto(dto);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      await registerRequest({ name, email, password });
      navigate("/login", {
        replace: true,
        state: { justRegistered: true },
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "สมัครสมาชิกไม่สำเร็จ";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-[fadeIn_300ms_ease-out]">
        <header className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <p className="mt-4 text-sm text-zinc-400">
            สร้างบัญชีเพื่อเริ่มบันทึกรายรับรายจ่าย
          </p>
        </header>

        <Card className="bg-zinc-900/70 p-6 backdrop-blur-xl sm:p-8">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <h2 className="font-heading text-xl font-bold text-zinc-100">
              สมัครสมาชิก
            </h2>

            {formError ? <FormAlert>{formError}</FormAlert> : null}

            <Input
              label="ชื่อ"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="ชื่อของคุณ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors.name}
              required
            />

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
              autoComplete="new-password"
              placeholder="อย่างน้อย 8 ตัวอักษร"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              required
            />

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              สมัครสมาชิก
            </Button>

            <p className="text-center text-sm text-zinc-400">
              มีบัญชีอยู่แล้ว?{" "}
              <Link
                to="/login"
                className="font-semibold text-emerald-400 hover:text-emerald-300"
              >
                เข้าสู่ระบบ
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
}
