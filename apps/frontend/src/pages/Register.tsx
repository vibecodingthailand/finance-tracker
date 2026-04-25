import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { RegisterDto } from '@finance-tracker/shared';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ApiError, apiFetch } from '../lib/api';
import { validateDto, type FieldErrors } from '../lib/validate-dto';

interface RegisterFormState {
  name: string;
  email: string;
  password: string;
}

const INITIAL_STATE: RegisterFormState = { name: '', email: '', password: '' };

export function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState<RegisterFormState>(INITIAL_STATE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegisterDto>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key: keyof RegisterFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const errors = await validateDto(RegisterDto, values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await apiFetch<unknown>('/api/auth/register', {
        method: 'POST',
        body: values,
      });
      navigate('/login', { replace: true });
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
      title="สมัครสมาชิก"
      subtitle="สร้างบัญชีเพื่อเริ่มบันทึกรายรับรายจ่ายของคุณ"
      footer={
        <span>
          มีบัญชีอยู่แล้ว?{' '}
          <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
            เข้าสู่ระบบ
          </Link>
        </span>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Input
          label="ชื่อ"
          type="text"
          name="name"
          autoComplete="name"
          placeholder="ชื่อที่ใช้แสดง"
          value={values.name}
          onChange={handleChange('name')}
          error={fieldErrors.name}
          required
        />
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
          autoComplete="new-password"
          placeholder="อย่างน้อย 8 ตัวอักษร"
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
          สมัครสมาชิก
        </Button>
      </form>
    </AuthLayout>
  );
}
