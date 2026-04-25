import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { LoginDto, type AuthResponse } from '@finance-tracker/shared';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, apiFetch } from '../lib/api';
import { validateDto, type FieldErrors } from '../lib/validate-dto';

interface LoginFormState {
  email: string;
  password: string;
}

const INITIAL_STATE: LoginFormState = { email: '', password: '' };

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [values, setValues] = useState<LoginFormState>(INITIAL_STATE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LoginDto>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key: keyof LoginFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const errors = await validateDto(LoginDto, values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const result = await apiFetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: values,
      });
      await login(result.accessToken);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="เข้าสู่ระบบ"
      subtitle="ยินดีต้อนรับกลับมา จัดการบันทึกรายรับรายจ่ายของคุณ"
      footer={
        <span>
          ยังไม่มีบัญชี?{' '}
          <Link to="/register" className="font-medium text-emerald-400 hover:text-emerald-300">
            สมัครสมาชิก
          </Link>
        </span>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Input
          label="อีเมล"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={handleChange('email')}
          error={fieldErrors.email}
          required
        />
        <Input
          label="รหัสผ่าน"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="กรอกรหัสผ่านของคุณ"
          value={values.password}
          onChange={handleChange('password')}
          error={fieldErrors.password}
          required
        />
        {formError ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {formError}
          </div>
        ) : null}
        <Button type="submit" loading={submitting} className="mt-2 w-full">
          เข้าสู่ระบบ
        </Button>
      </form>
    </AuthLayout>
  );
}
