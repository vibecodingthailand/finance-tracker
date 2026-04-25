import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CreateTransactionDto,
  TransactionType,
  type CategoryResponse,
  type TransactionResponse,
} from '@finance-tracker/shared';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { ApiError } from '../lib/api';
import { validateDto, type FieldErrors } from '../lib/validate-dto';

interface TransactionFormModalProps {
  open: boolean;
  initial: TransactionResponse | null;
  categories: CategoryResponse[];
  onClose: () => void;
  onSubmit: (payload: CreateTransactionDto, id: string | null) => Promise<void>;
}

interface FormState {
  amount: string;
  type: TransactionType;
  categoryId: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  amount: '',
  type: TransactionType.EXPENSE,
  categoryId: '',
  description: '',
};

export function TransactionFormModal({
  open,
  initial,
  categories,
  onClose,
  onSubmit,
}: TransactionFormModalProps) {
  const [values, setValues] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<CreateTransactionDto>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = initial !== null;

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
    if (initial) {
      setValues({
        amount: initial.amount.toString(),
        type: initial.type,
        categoryId: initial.categoryId,
        description: initial.description ?? '',
      });
    } else {
      setValues(EMPTY_FORM);
    }
  }, [open, initial]);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === values.type),
    [categories, values.type],
  );

  useEffect(() => {
    if (!open) return;
    if (filteredCategories.length === 0) {
      if (values.categoryId !== '') setValues((prev) => ({ ...prev, categoryId: '' }));
      return;
    }
    const stillValid = filteredCategories.some((category) => category.id === values.categoryId);
    if (!stillValid) {
      setValues((prev) => ({ ...prev, categoryId: filteredCategories[0]!.id }));
    }
  }, [open, filteredCategories, values.categoryId]);

  const handleTypeChange = (nextType: TransactionType) => {
    setValues((prev) => ({ ...prev, type: nextType }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedDescription = values.description.trim();
    const payloadCandidate = {
      amount: Number(values.amount),
      type: values.type,
      categoryId: values.categoryId,
      description: trimmedDescription === '' ? undefined : trimmedDescription,
    };

    const errors = await validateDto(CreateTransactionDto, payloadCandidate);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(payloadCandidate as CreateTransactionDto, initial?.id ?? null);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title={isEdit ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}
      closeOnBackdrop={!submitting}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TypeToggle value={values.type} onChange={handleTypeChange} />

        <Select
          label="หมวดหมู่"
          name="categoryId"
          value={values.categoryId}
          onChange={(event) => setValues((prev) => ({ ...prev, categoryId: event.target.value }))}
          options={filteredCategories.map((category) => ({
            value: category.id,
            label: `${category.icon} ${category.name}`,
          }))}
          placeholder={filteredCategories.length === 0 ? 'ยังไม่มีหมวดหมู่' : undefined}
          disabled={filteredCategories.length === 0}
          error={fieldErrors.categoryId}
        />

        <Input
          label="จำนวนเงิน"
          type="number"
          name="amount"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={values.amount}
          onChange={(event) => setValues((prev) => ({ ...prev, amount: event.target.value }))}
          error={fieldErrors.amount}
        />

        <DescriptionField
          value={values.description}
          error={fieldErrors.description}
          onChange={(next) => setValues((prev) => ({ ...prev, description: next }))}
        />

        {formError ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {formError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={submitting} className="sm:min-w-32">
            {isEdit ? 'บันทึกการแก้ไข' : 'บันทึก'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface TypeToggleProps {
  value: TransactionType;
  onChange: (next: TransactionType) => void;
}

function TypeToggle({ value, onChange }: TypeToggleProps) {
  const baseClass =
    'flex-1 min-h-[44px] rounded-xl border text-sm font-semibold transition focus:outline-none focus:ring-2';
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-300">ประเภท</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(TransactionType.EXPENSE)}
          className={
            value === TransactionType.EXPENSE
              ? `${baseClass} border-rose-500/60 bg-rose-500/10 text-rose-300 focus:ring-rose-500/40`
              : `${baseClass} border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 focus:ring-zinc-500/40`
          }
        >
          รายจ่าย
        </button>
        <button
          type="button"
          onClick={() => onChange(TransactionType.INCOME)}
          className={
            value === TransactionType.INCOME
              ? `${baseClass} border-emerald-500/60 bg-emerald-500/10 text-emerald-300 focus:ring-emerald-500/40`
              : `${baseClass} border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 focus:ring-zinc-500/40`
          }
        >
          รายรับ
        </button>
      </div>
    </div>
  );
}

interface DescriptionFieldProps {
  value: string;
  error?: string;
  onChange: (next: string) => void;
}

function DescriptionField({ value, error, onChange }: DescriptionFieldProps) {
  const borderClass = error ? 'border-rose-500/60' : 'border-zinc-800 focus:border-emerald-500/60';
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="transaction-description" className="text-sm font-medium text-zinc-300">
        รายละเอียด <span className="text-zinc-500">(ไม่บังคับ)</span>
      </label>
      <textarea
        id="transaction-description"
        name="description"
        rows={3}
        maxLength={500}
        placeholder="เช่น ค่ากาแฟ"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-h-[88px] w-full resize-none rounded-xl border bg-zinc-800/80 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-emerald-500/50 ${borderClass}`}
      />
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </div>
  );
}
