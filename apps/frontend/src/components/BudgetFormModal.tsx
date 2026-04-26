import { useCallback, useEffect, useState } from 'react';
import { UpdateBudgetDto } from '@finance-tracker/shared';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { ApiError, apiFetch } from '../lib/api';
import { validateDto, type FieldErrors } from '../lib/validate-dto';

interface BudgetFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryId: string;
  categoryName: string;
  month: number;
  year: number;
  currentAmount?: number;
}

export function BudgetFormModal({
  open,
  onClose,
  onSuccess,
  categoryId,
  categoryName,
  month,
  year,
  currentAmount,
}: BudgetFormModalProps) {
  const isEdit = currentAmount !== undefined;
  const [amount, setAmount] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<UpdateBudgetDto>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(currentAmount !== undefined ? String(currentAmount) : '');
      setFieldErrors({});
      setFormError(null);
    }
  }, [open, currentAmount]);

  const handleSubmit = useCallback(async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      setFieldErrors({ amount: 'กรุณากรอกจำนวนเงิน' });
      return;
    }
    const errors = await validateDto(UpdateBudgetDto, { amount: parsedAmount });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (isEdit) {
        await apiFetch<void>(`/api/budgets/${categoryId}?month=${month}&year=${year}`, {
          method: 'PATCH',
          body: { amount: parsedAmount },
        });
      } else {
        await apiFetch<void>('/api/budgets', {
          method: 'POST',
          body: { amount: parsedAmount, categoryId, month, year },
        });
      }
      onSuccess();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  }, [amount, isEdit, categoryId, month, year, onSuccess]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `แก้ไขงบ "${categoryName}"` : `ตั้งงบ "${categoryName}"`}
      closeOnBackdrop={!submitting}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {isEdit ? 'บันทึกการแก้ไข' : 'ตั้งงบ'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="จำนวนเงินงบประมาณ (บาท)"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={fieldErrors.amount}
        />
        {formError ? <p className="text-sm text-rose-400">{formError}</p> : null}
      </div>
    </Modal>
  );
}
