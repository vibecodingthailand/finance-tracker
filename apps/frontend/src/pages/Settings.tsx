import { useCallback, useEffect, useRef, useState } from "react";
import { Link as LinkIcon, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FormAlert } from "../components/ui/FormAlert";
import { ApiError } from "../lib/api";
import { requestLinkCode } from "../lib/link-api";

interface ActiveCode {
  code: string;
  expiresAtMs: number;
}

export default function Settings() {
  const [activeCode, setActiveCode] = useState<ActiveCode | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stopCountdown = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!activeCode) {
      stopCountdown();
      return;
    }
    const tick = () => {
      const ms = activeCode.expiresAtMs - Date.now();
      if (ms <= 0) {
        setRemainingMs(0);
        setActiveCode(null);
        stopCountdown();
        return;
      }
      setRemainingMs(ms);
    };
    tick();
    intervalRef.current = window.setInterval(tick, 1000);
    return stopCountdown;
  }, [activeCode, stopCountdown]);

  async function handleRequestCode() {
    setIsRequesting(true);
    setError(null);
    try {
      const response = await requestLinkCode();
      setActiveCode({
        code: response.code,
        expiresAtMs: new Date(response.expiresAt).getTime(),
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ขอโค้ดไม่สำเร็จ กรุณาลองใหม่",
      );
    } finally {
      setIsRequesting(false);
    }
  }

  const hasActiveCode = activeCode !== null && remainingMs > 0;

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="bg-gradient-to-r from-zinc-50 via-emerald-200 to-cyan-300 bg-clip-text font-heading text-2xl font-extrabold text-transparent">
          ตั้งค่า
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          จัดการบัญชีและการเชื่อมต่อภายนอก
        </p>
      </header>

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
              <LinkIcon size={18} />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-zinc-100">
                เชื่อม LINE
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                กดขอโค้ด 6 หลัก แล้วพิมพ์{" "}
                <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-emerald-300">
                  เชื่อม XXXXXX
                </code>{" "}
                ใน LINE bot เพื่อรวมรายการจาก LINE มาอยู่ในบัญชีนี้ โค้ดใช้ได้ 5
                นาที
              </p>
            </div>
          </div>
          <Button
            onClick={handleRequestCode}
            isLoading={isRequesting}
            variant={hasActiveCode ? "secondary" : "primary"}
            className="shrink-0"
          >
            <RefreshCw size={16} />
            {hasActiveCode ? "ขอโค้ดใหม่" : "ขอโค้ด"}
          </Button>
        </div>

        {error ? (
          <div className="mt-4">
            <FormAlert>{error}</FormAlert>
          </div>
        ) : null}

        {hasActiveCode ? (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-6">
            <p className="text-xs uppercase tracking-widest text-emerald-300">
              โค้ดของคุณ
            </p>
            <p className="font-heading text-5xl font-extrabold tracking-[0.3em] text-emerald-200 tabular-nums sm:text-6xl">
              {activeCode?.code}
            </p>
            <p className="text-sm text-zinc-400">
              หมดอายุในอีก{" "}
              <span className="font-semibold tabular-nums text-zinc-100">
                {formatCountdown(remainingMs)}
              </span>
            </p>
            <p className="text-center text-sm text-zinc-400">
              พิมพ์ใน LINE bot ว่า{" "}
              <code className="rounded bg-zinc-800/80 px-2 py-1 text-sm text-emerald-200">
                เชื่อม {activeCode?.code}
              </code>
            </p>
          </div>
        ) : null}
      </Card>
    </section>
  );
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
