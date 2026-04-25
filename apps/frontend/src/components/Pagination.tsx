interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onChange: (nextPage: number) => void;
}

const buttonClass =
  'inline-flex min-h-[40px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-zinc-800';

export function Pagination({ page, totalPages, total, onChange }: PaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-zinc-400">
        ทั้งหมด <span className="font-medium text-zinc-200">{total.toLocaleString('th-TH')}</span>{' '}
        รายการ · หน้า {page} จาก {safeTotalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          ก่อนหน้า
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={page >= safeTotalPages}
          onClick={() => onChange(page + 1)}
        >
          ถัดไป
        </button>
      </div>
    </div>
  );
}
