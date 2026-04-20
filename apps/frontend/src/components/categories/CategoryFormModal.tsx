import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { CategoryResponse } from "@finance-tracker/shared";
import {
  CreateCategoryDto,
  TransactionType,
  UpdateCategoryDto,
} from "@finance-tracker/shared";
import { ApiError } from "../../lib/api";
import {
  createCategory,
  updateCategory,
} from "../../lib/categories-api";
import { validateDto } from "../../lib/validate-dto";
import type { FieldErrors } from "../../lib/validate-dto";
import { Button } from "../ui/Button";
import { FormAlert } from "../ui/FormAlert";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

interface CategoryFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  category: CategoryResponse | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  icon: string;
  type: TransactionType;
}

const EMPTY_FORM: FormState = {
  name: "",
  icon: "",
  type: TransactionType.EXPENSE,
};

type CategoryFieldErrors = FieldErrors<CreateCategoryDto>;

export function CategoryFormModal({
  isOpen,
  mode,
  category,
  onClose,
  onSaved,
}: CategoryFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<CategoryFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFieldErrors({});
    setFormError(null);
    if (mode === "edit" && category) {
      setForm({
        name: category.name,
        icon: category.icon,
        type: category.type,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, mode, category]);

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    const icon = form.icon.trim();

    if (mode === "edit" && category) {
      const dto = Object.assign(new UpdateCategoryDto(), { name, icon });
      const errors = await validateDto(dto);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors as CategoryFieldErrors);
        return;
      }
      setFieldErrors({});
      setIsSubmitting(true);
      try {
        await updateCategory(category.id, { name, icon });
        onSaved();
      } catch (err) {
        setFormError(
          err instanceof ApiError ? err.message : "แก้ไขหมวดไม่สำเร็จ",
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const dto = Object.assign(new CreateCategoryDto(), {
      name,
      icon,
      type: form.type,
    });
    const errors = await validateDto(dto);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await createCategory({ name, icon, type: form.type });
      onSaved();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "สร้างหมวดไม่สำเร็จ",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "edit" ? "แก้ไขหมวด" : "เพิ่มหมวดใหม่";
  const submitLabel = mode === "edit" ? "บันทึก" : "เพิ่มหมวด";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button type="submit" form="category-form" isLoading={isSubmitting}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id="category-form"
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
        noValidate
      >
        {formError ? <FormAlert>{formError}</FormAlert> : null}

        {mode === "create" ? (
          <div className="grid grid-cols-2 gap-2">
            <TypeToggle
              label="รายจ่าย"
              active={form.type === TransactionType.EXPENSE}
              activeClassName="bg-rose-500/15 text-rose-300 ring-rose-500/40"
              onClick={() => updateField("type", TransactionType.EXPENSE)}
            />
            <TypeToggle
              label="รายรับ"
              active={form.type === TransactionType.INCOME}
              activeClassName="bg-emerald-500/15 text-emerald-300 ring-emerald-500/40"
              onClick={() => updateField("type", TransactionType.INCOME)}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-xs text-zinc-500">
            ไม่สามารถเปลี่ยนประเภทหมวดหลังสร้างแล้ว
          </div>
        )}

        <Input
          label="ไอคอน (อีโมจิ)"
          name="icon"
          type="text"
          placeholder="เช่น 🍜"
          value={form.icon}
          onChange={(e) => updateField("icon", e.target.value)}
          error={fieldErrors.icon}
          maxLength={50}
          required
        />

        <Input
          label="ชื่อหมวด"
          name="name"
          type="text"
          placeholder="เช่น อาหาร"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          error={fieldErrors.name}
          maxLength={50}
          required
        />
      </form>
    </Modal>
  );
}

interface TypeToggleProps {
  label: string;
  active: boolean;
  activeClassName: string;
  onClick: () => void;
}

function TypeToggle({
  label,
  active,
  activeClassName,
  onClick,
}: TypeToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-lg border px-4 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 ${
        active
          ? `border-transparent ring-2 ${activeClassName}`
          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
