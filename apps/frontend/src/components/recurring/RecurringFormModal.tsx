import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  CategoryResponse,
  RecurringResponse,
} from "@finance-tracker/shared";
import {
  CreateRecurringDto,
  TransactionType,
} from "@finance-tracker/shared";
import { ApiError } from "../../lib/api";
import {
  createRecurring,
  updateRecurring,
} from "../../lib/recurring-api";
import { validateDto } from "../../lib/validate-dto";
import type { FieldErrors } from "../../lib/validate-dto";
import { Button } from "../ui/Button";
import { FormAlert } from "../ui/FormAlert";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

interface RecurringFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  recurring: RecurringResponse | null;
  categories: CategoryResponse[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  amount: string;
  type: TransactionType;
  description: string;
  categoryId: string;
  dayOfMonth: string;
}

const EMPTY_FORM: FormState = {
  amount: "",
  type: TransactionType.EXPENSE,
  description: "",
  categoryId: "",
  dayOfMonth: "1",
};

export function RecurringFormModal({
  isOpen,
  mode,
  recurring,
  categories,
  onClose,
  onSaved,
}: RecurringFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<CreateRecurringDto>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFieldErrors({});
    setFormError(null);
    if (mode === "edit" && recurring) {
      setForm({
        amount: recurring.amount.toString(),
        type: recurring.type,
        description: recurring.description ?? "",
        categoryId: recurring.categoryId,
        dayOfMonth: recurring.dayOfMonth.toString(),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, mode, recurring]);

  const filteredCategories = categories.filter((c) => c.type === form.type);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "type") {
        const nextType = value as TransactionType;
        const stillValid = categories.some(
          (c) => c.id === prev.categoryId && c.type === nextType,
        );
        if (!stillValid) next.categoryId = "";
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const amountNumber = Number(form.amount);
    const dayNumber = Number(form.dayOfMonth);
    const description = form.description.trim();
    const dto = Object.assign(new CreateRecurringDto(), {
      amount: Number.isFinite(amountNumber) ? amountNumber : NaN,
      type: form.type,
      description: description === "" ? undefined : description,
      categoryId: form.categoryId,
      dayOfMonth: Number.isFinite(dayNumber) ? dayNumber : NaN,
    });

    const errors = await validateDto(dto);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      const payload = {
        amount: amountNumber,
        type: form.type,
        description: description === "" ? undefined : description,
        categoryId: form.categoryId,
        dayOfMonth: dayNumber,
      };
      if (mode === "edit" && recurring) {
        await updateRecurring(recurring.id, payload);
      } else {
        await createRecurring(payload);
      }
      onSaved();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : mode === "edit"
            ? "แก้ไขรายการซ้ำไม่สำเร็จ"
            : "สร้างรายการซ้ำไม่สำเร็จ";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "edit" ? "แก้ไขรายการซ้ำ" : "เพิ่มรายการซ้ำ";
  const submitLabel = mode === "edit" ? "บันทึก" : "เพิ่มรายการซ้ำ";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button
            type="submit"
            form="recurring-form"
            isLoading={isSubmitting}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id="recurring-form"
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
        noValidate
      >
        {formError ? <FormAlert>{formError}</FormAlert> : null}

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

        <Input
          label="จำนวนเงิน"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => updateField("amount", e.target.value)}
          error={fieldErrors.amount}
          required
        />

        <Select
          label="หมวด"
          name="categoryId"
          value={form.categoryId}
          onChange={(e) => updateField("categoryId", e.target.value)}
          error={fieldErrors.categoryId}
          required
        >
          <option value="">เลือกหมวด</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </Select>

        <Select
          label="วันที่ของเดือน"
          name="dayOfMonth"
          value={form.dayOfMonth}
          onChange={(e) => updateField("dayOfMonth", e.target.value)}
          error={fieldErrors.dayOfMonth}
          required
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              วันที่ {d}
            </option>
          ))}
        </Select>

        <Input
          label="รายละเอียด (ไม่บังคับ)"
          name="description"
          type="text"
          placeholder="เช่น ค่าเช่าคอนโด"
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          error={fieldErrors.description}
          maxLength={500}
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
