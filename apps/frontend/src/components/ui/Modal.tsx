import { useEffect, type ReactNode } from 'react';
import { XIcon } from '../icons';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
}

export function Modal({ open, onClose, title, children, footer, closeOnBackdrop = true }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className="relative flex min-h-screen w-full flex-col bg-zinc-900 text-zinc-100 sm:min-h-0 sm:max-h-[90vh] sm:max-w-lg sm:rounded-xl sm:border sm:border-zinc-800 sm:shadow-xl animate-[fadeIn_200ms_ease-out]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="ปิด"
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            onClick={onClose}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="border-t border-zinc-800 px-5 py-3">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
