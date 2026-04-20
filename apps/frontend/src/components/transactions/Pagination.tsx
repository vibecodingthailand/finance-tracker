import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onChange: (nextPage: number) => void;
}

export function Pagination({ page, limit, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-zinc-500">
        แสดง {start}-{end} จาก {total} รายการ
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => canPrev && onChange(page - 1)}
          disabled={!canPrev}
          aria-label="หน้าก่อนหน้า"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 transition duration-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-600"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[90px] text-center text-sm font-medium text-zinc-200">
          หน้า {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => canNext && onChange(page + 1)}
          disabled={!canNext}
          aria-label="หน้าถัดไป"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 transition duration-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-600"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
