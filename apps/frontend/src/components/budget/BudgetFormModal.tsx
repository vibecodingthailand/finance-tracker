import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { CategoryResponse } from "@finance-tracker/shared";
import { CreateBudgetDto } from "@finance-tracker/shared";
import { ApiError } from "../../lib/api";
import { saveBudget } from "../../lib/budget-api";
import { validateDto } from "../../lib/validate-dto";
import type { FieldErrors } from "../../lib/validate-dto";
import { formatMonthYearThai } from "../../lib/format";
import { Button } from "../ui/Button";
import { FormAlert } from "../ui/FormAlert";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

interface BudgetFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  category: CategoryResponse | null;
  currentAmount: number;
  month: number;
  year: number;
  onClose: () => void;
  onSaved: () => void;
}

export function BudgetFormModal({
  isOpen,
  mode,
  category,
  currentAmount,
  month,
  year,
  onClose,
  onSaved,
}: BudgetFormModalProps) {
  const [amount, setAmount] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<CreateBudgetDto>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFieldErrors({});
    setFormError(null);
    setAmount(
      mode === "edit" && currentAmount > 0 ? currentAmount.toString() : "",
    );
  }, [isOpen, mode, currentAmount]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category) return;
    setFormError(null);

    const amountNumber = Number(amount);
    const dto = Object.assign(new CreateBudgetDto(), {
      amount: Number.isFinite(amountNumber) ? amountNumber : NaN,
      categoryId: category.id,
      month,
      year,
    });

    const errors = await validateDto(dto);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      await saveBudget({
        amount: amountNumber,
        categoryId: category.id,
        month,
        year,
      });
      onSaved();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : mode === "edit"
            ? "แก้ไขงบไม่สำเร็จ"
            : "ตั้งงบไม่สำเร็จ";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "edit" ? "แก้ไขงบประมาณ" : "ตั้งงบประมาณ";
  const submitLabel = mode === "edit" ? "บันทึก" : "ตั้งงบ";

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
          <Button type="submit" form="budget-form" isLoading={isSubmitting}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id="budget-form"
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
        noValidate
      >
        {formError ? <FormAlert>{formError}</FormAlert> : null}

        {category ? (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/60 px-4 py-3">
            <span className="text-2xl">{category.icon}</span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-100">
                {category.name}
              </span>
              <span className="text-xs text-zinc-400">
                {formatMonthYearThai(year, month)}
              </span>
            </div>
          </div>
        ) : null}

        <Input
          label="จำนวนงบ (บาท)"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={fieldErrors.amount}
          required
          autoFocus
        />
      </form>
    </Modal>
  );
}
