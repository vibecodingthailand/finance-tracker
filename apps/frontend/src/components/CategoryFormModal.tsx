import { useEffect, useState, type FormEvent } from 'react';
import {
  CreateCategoryDto,
  TransactionType,
  UpdateCategoryDto,
  type CategoryResponse,
} from '@finance-tracker/shared';
import { TypeToggle } from './TypeToggle';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { ApiError } from '../lib/api';
import { validateDto, type FieldErrors } from '../lib/validate-dto';

export interface CategoryFormPayload {
  name: string;
  icon: string;
  type: TransactionType;
}

interface CategoryFormModalProps {
  open: boolean;
  initial: CategoryResponse | null;
  defaultType?: TransactionType;
  onClose: () => void;
  onSubmit: (payload: CategoryFormPayload, id: string | null) => Promise<void>;
}

interface FormState {
  name: string;
  icon: string;
  type: TransactionType;
}

const EMPTY_FORM: FormState = {
  name: '',
  icon: '',
  type: TransactionType.EXPENSE,
};

type CombinedErrors = FieldErrors<CreateCategoryDto> & FieldErrors<UpdateCategoryDto>;

export function CategoryFormModal({
  open,
  initial,
  defaultType,
  onClose,
  onSubmit,
}: CategoryFormModalProps) {
  const [values, setValues] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<CombinedErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = initial !== null;

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
    if (initial) {
      setValues({ name: initial.name, icon: initial.icon, type: initial.type });
    } else {
      setValues({ ...EMPTY_FORM, type: defaultType ?? TransactionType.EXPENSE });
    }
  }, [open, initial, defaultType]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedName = values.name.trim();
    const trimmedIcon = values.icon.trim();

    const errors = isEdit
      ? await validateDto(UpdateCategoryDto, { name: trimmedName, icon: trimmedIcon })
      : await validateDto(CreateCategoryDto, {
          name: trimmedName,
          icon: trimmedIcon,
          type: values.type,
        });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(
        { name: trimmedName, icon: trimmedIcon, type: values.type },
        initial?.id ?? null,
      );
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
      title={isEdit ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}
      closeOnBackdrop={!submitting}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TypeToggle
          value={values.type}
          onChange={(next) => setValues((prev) => ({ ...prev, type: next }))}
          disabled={isEdit}
        />
        {isEdit ? (
          <p className="-mt-2 text-xs text-zinc-500">ไม่สามารถเปลี่ยนประเภทของหมวดหมู่ได้</p>
        ) : null}

        <Input
          label="ไอคอน"
          name="icon"
          maxLength={4}
          placeholder="เช่น 🍜 หรือ ☕"
          value={values.icon}
          onChange={(event) => setValues((prev) => ({ ...prev, icon: event.target.value }))}
          error={fieldErrors.icon}
        />

        <Input
          label="ชื่อหมวดหมู่"
          name="name"
          maxLength={50}
          placeholder="เช่น อาหาร, เงินเดือน"
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          error={fieldErrors.name}
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
            {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
