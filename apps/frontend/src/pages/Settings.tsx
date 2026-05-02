import { useEffect, useState } from 'react';
import type { LinkCodeResponse } from '@finance-tracker/shared';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { ApiError, apiFetch } from '../lib/api';

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Settings() {
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
    <div className="mx-auto max-w-lg space-y-6 animate-[fadeIn_300ms_ease-out]">
      <PageHeader title="ตั้งค่า" subtitle="จัดการบัญชีและการเชื่อมต่อ" />

      <Card className="p-6">
        <h2 className="mb-1 font-heading text-lg font-semibold text-zinc-100">เชื่อม LINE</h2>
        <p className="mb-5 text-sm text-zinc-400">
          เชื่อมบัญชี LINE กับบัญชีเว็บเพื่อดูรายการทั้งหมดในที่เดียว
        </p>

        {!code || expired ? (
          <Button onClick={() => void requestCode()} loading={loading} className="w-full sm:w-auto">
            {expired ? 'ขอ code ใหม่' : 'ขอ code'}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
              <p className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
                code ของคุณ
              </p>
              <p className="font-mono text-5xl font-bold tracking-[0.25em] text-emerald-400">
                {code}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                หมดอายุใน{' '}
                <span className="font-semibold text-zinc-200">{formatCountdown(secondsLeft)}</span>
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3 text-sm text-zinc-300">
              <p className="mb-1 font-medium text-zinc-100">วิธีเชื่อม</p>
              <p>
                พิมพ์ใน LINE bot ว่า{' '}
                <span className="font-mono font-semibold text-emerald-400">
                  เชื่อม {code}
                </span>
              </p>
            </div>
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      </Card>
    </div>
  );
}
