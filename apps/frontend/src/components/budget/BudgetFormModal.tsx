import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { CategoryResponse } from "@finance-tracker/shared";
import { CreateBudgetDto, UpdateBudgetDto } from "@finance-tracker/shared";
import { ApiError } from "../../lib/api";
import { createBudget, updateBudget } from "../../lib/budget-api";
import { validateDto } from "../../lib/validate-dto";
import type { FieldErrors } from "../../lib/validate-dto";
import { formatMonthYearThai } from "../../lib/format";
import { Button } from "../ui/Button";
import { FormAlert } from "../ui/FormAlert";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

interface BudgetFormModalProps {
  isOpen: boolean;
  category: CategoryResponse | null;
  budgetId: string | null;
  currentAmount: number;
  month: number;
  year: number;
  onClose: () => void;
  onSaved: () => void;
}

export function BudgetFormModal({
  isOpen,
  category,
  budgetId,
  currentAmount,
  month,
  year,
  onClose,
  onSaved,
}: BudgetFormModalProps) {
  const mode: "create" | "edit" = budgetId ? "edit" : "create";

  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAmountError(undefined);
    setFormError(null);
    setAmount(mode === "edit" ? currentAmount.toString() : "");
  }, [isOpen, mode, currentAmount]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category) return;
    setFormError(null);

    const amountNumber = Number(amount);
    const amountValue = Number.isFinite(amountNumber) ? amountNumber : NaN;

    const error =
      mode === "edit"
        ? await validateAmount(new UpdateBudgetDto(), { amount: amountValue })
        : await validateAmount(new CreateBudgetDto(), {
            amount: amountValue,
            categoryId: category.id,
            month,
            year,
          });
    if (error) {
      setAmountError(error);
      return;
    }
    setAmountError(undefined);

    setIsSubmitting(true);
    try {
      if (mode === "edit" && budgetId) {
        await updateBudget(budgetId, { amount: amountNumber });
      } else {
        await createBudget({
          amount: amountNumber,
          categoryId: category.id,
          month,
          year,
        });
      }
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
          error={amountError}
          required
          autoFocus
        />
      </form>
    </Modal>
  );
}

async function validateAmount<T extends object>(
  instance: T,
  values: Partial<T> & { amount: number },
): Promise<string | undefined> {
  Object.assign(instance, values);
  const errors = await validateDto(instance as object);
  return (errors as FieldErrors<{ amount: number }>).amount;
}
