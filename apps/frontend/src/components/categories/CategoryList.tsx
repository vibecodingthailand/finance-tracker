import { Pencil, Trash2 } from "lucide-react";
import type { CategoryResponse } from "@finance-tracker/shared";

interface CategoryListProps {
  title: string;
  accentClassName: string;
  categories: CategoryResponse[];
  onEdit: (category: CategoryResponse) => void;
  onDelete: (category: CategoryResponse) => void;
  emptyLabel: string;
}

export function CategoryList({
  title,
  accentClassName,
  categories,
  onEdit,
  onDelete,
  emptyLabel,
}: CategoryListProps) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className={`font-heading text-lg font-bold ${accentClassName}`}>
        {title}
      </h3>
      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
          {emptyLabel}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {categories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface CategoryRowProps {
  category: CategoryResponse;
  onEdit: (category: CategoryResponse) => void;
  onDelete: (category: CategoryResponse) => void;
}

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const isDefault = category.userId === null;
  return (
    <li className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 shadow-lg">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xl"
        aria-hidden="true"
      >
        {category.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-100">
            {category.name}
          </p>
          {isDefault ? (
            <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Default
            </span>
          ) : null}
        </div>
      </div>
      {!isDefault ? (
        <div className="flex items-center gap-1">
          <IconButton
            label="แก้ไข"
            onClick={() => onEdit(category)}
          >
            <Pencil size={16} />
          </IconButton>
          <IconButton
            label="ลบ"
            onClick={() => onDelete(category)}
            destructive
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      ) : null}
    </li>
  );
}

interface IconButtonProps {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}

function IconButton({
  label,
  onClick,
  destructive = false,
  children,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-lg transition duration-200 focus:outline-none focus:ring-2 ${
        destructive
          ? "text-rose-400 hover:bg-rose-500/10 focus:ring-rose-500/40"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 focus:ring-zinc-500/40"
      }`}
    >
      {children}
    </button>
  );
}
