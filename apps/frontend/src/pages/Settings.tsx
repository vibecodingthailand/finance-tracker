import { useEffect, useState } from 'react';
import type { LinkCodeResponse } from '@finance-tracker/shared';
import { ErrorState } from '../components/ErrorState';
import { PageHeader } from '../components/PageHeader';
import { LogOutIcon } from '../components/icons';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, apiFetch } from '../lib/api';

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Settings() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 animate-[fadeIn_300ms_ease-out]">
      <PageHeader title="ตั้งค่า" subtitle="จัดการบัญชีและการเชื่อมต่อ" />
      <AccountSection />
      <LinkLineSection />
      <DangerZoneSection />
    </div>
  );
}

function AccountSection() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <SettingsSection title="บัญชีของฉัน" description="ข้อมูลที่ใช้แสดงในแอป">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xl font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-zinc-100">{user.name}</p>
          <p className="truncate text-sm text-zinc-500">{user.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={logout} className="gap-2">
          <LogOutIcon className="h-4 w-4" />
          ออกจากระบบ
        </Button>
      </div>
    </SettingsSection>
  );
}

function LinkLineSection() {
  const toast = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const requestCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<LinkCodeResponse>('/api/link/code', { method: 'POST' });
      setCode(data.code);
      const secs = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(secs);
      toast.success('สร้าง code แล้ว');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const expired = code !== null && secondsLeft <= 0;

  return (
    <SettingsSection
      title="เชื่อม LINE"
      description="เชื่อมบัญชี LINE กับบัญชีเว็บเพื่อบันทึกรายการผ่านแชทและดูข้อมูลในที่เดียว"
    >
      {!code || expired ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            กดเพื่อขอ code 6 หลักสำหรับใช้กับ LINE bot
          </p>
          <Button onClick={() => void requestCode()} loading={loading}>
            {expired ? 'ขอ code ใหม่' : 'ขอ code'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-5 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              code ของคุณ
            </p>
            <p className="mt-2 font-mono text-5xl font-bold tracking-[0.25em] text-emerald-400">
              {code}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              หมดอายุใน{' '}
              <span className="font-semibold text-zinc-200 tabular-nums">
                {formatCountdown(secondsLeft)}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-300">
            <p className="mb-1 font-medium text-zinc-100">วิธีเชื่อม</p>
            <p>
              พิมพ์ใน LINE bot ว่า{' '}
              <span className="font-mono font-semibold text-emerald-400">เชื่อม {code}</span>
            </p>
          </div>
        </div>
      )}

      {error ? <ErrorState className="mt-4" message={error} /> : null}
    </SettingsSection>
  );
}

function DangerZoneSection() {
  return (
    <SettingsSection
      title="โซนอันตราย"
      description="การกระทำในส่วนนี้ไม่สามารถย้อนกลับได้"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100">ลบบัญชีของฉัน</p>
          <p className="text-sm text-zinc-500">
            ลบบัญชีและข้อมูลทั้งหมดถาวร — ฟีเจอร์กำลังพัฒนา
          </p>
        </div>
        <Badge tone="warning">เร็วๆ นี้</Badge>
      </div>
    </SettingsSection>
  );
}

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <Card className="px-5 py-5 sm:px-6 sm:py-6">
      <div className="mb-4">
        <h2 className="font-heading text-lg font-semibold text-zinc-100">{title}</h2>
        {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}
