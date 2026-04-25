import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  error?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  error,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={loading ? () => undefined : onClose} title={title}>
      <p className="text-sm text-zinc-400">{description}</p>
      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} loading={loading} className="sm:min-w-32">
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
