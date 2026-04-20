import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  CategoryResponse,
  TransactionResponse,
} from "@finance-tracker/shared";
import {
  CreateTransactionDto,
  TransactionType,
} from "@finance-tracker/shared";
import { ApiError } from "../../lib/api";
import {
  createTransaction,
  updateTransaction,
} from "../../lib/transactions-api";
import { validateDto } from "../../lib/validate-dto";
import type { FieldErrors } from "../../lib/validate-dto";
import { Button } from "../ui/Button";
import { FormAlert } from "../ui/FormAlert";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

interface TransactionFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  transaction: TransactionResponse | null;
  categories: CategoryResponse[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  amount: string;
  type: TransactionType;
  description: string;
  categoryId: string;
}

const EMPTY_FORM: FormState = {
  amount: "",
  type: TransactionType.EXPENSE,
  description: "",
  categoryId: "",
};

export function TransactionFormModal({
  isOpen,
  mode,
  transaction,
  categories,
  onClose,
  onSaved,
}: TransactionFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<CreateTransactionDto>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFieldErrors({});
    setFormError(null);
    if (mode === "edit" && transaction) {
      setForm({
        amount: transaction.amount.toString(),
        type: transaction.type,
        description: transaction.description ?? "",
        categoryId: transaction.categoryId,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, mode, transaction]);

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
    const description = form.description.trim();
    const dto = Object.assign(new CreateTransactionDto(), {
      amount: Number.isFinite(amountNumber) ? amountNumber : NaN,
      type: form.type,
      description: description === "" ? undefined : description,
      categoryId: form.categoryId,
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
      };
      if (mode === "edit" && transaction) {
        await updateTransaction(transaction.id, payload);
      } else {
        await createTransaction(payload);
      }
      onSaved();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : mode === "edit"
            ? "แก้ไขรายการไม่สำเร็จ"
            : "สร้างรายการไม่สำเร็จ";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "edit" ? "แก้ไขรายการ" : "เพิ่มรายการ";
  const submitLabel = mode === "edit" ? "บันทึก" : "เพิ่มรายการ";

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
            form="transaction-form"
            isLoading={isSubmitting}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id="transaction-form"
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

        <Input
          label="รายละเอียด (ไม่บังคับ)"
          name="description"
          type="text"
          placeholder="เช่น ข้าวเที่ยง"
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
