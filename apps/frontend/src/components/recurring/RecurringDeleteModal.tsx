import { useState } from "react";
import type { RecurringResponse } from "@finance-tracker/shared";
import { TransactionType } from "@finance-tracker/shared";
import { ApiError } from "../../lib/api";
import { deleteRecurring } from "../../lib/recurring-api";
import { Button } from "../ui/Button";
import { FormAlert } from "../ui/FormAlert";
import { Modal } from "../ui/Modal";
import { formatBaht } from "../../lib/format";

interface RecurringDeleteModalProps {
  isOpen: boolean;
  recurring: RecurringResponse | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function RecurringDeleteModal({
  isOpen,
  recurring,
  onClose,
  onDeleted,
}: RecurringDeleteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!recurring) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await deleteRecurring(recurring.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (isSubmitting) return;
    setError(null);
    onClose();
  }

  const isIncome = recurring?.type === TransactionType.INCOME;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="ยืนยันการลบ"
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={isSubmitting}
            className="bg-rose-500 text-zinc-50 hover:bg-rose-400 focus:ring-rose-500/50"
          >
            ลบรายการซ้ำ
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <FormAlert>{error}</FormAlert> : null}

        <p className="text-sm text-zinc-300">
          คุณแน่ใจว่าต้องการลบรายการซ้ำนี้? รายการที่ถูกสร้างไปแล้วจะยังอยู่
        </p>

        {recurring ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-100">
                  {recurring.description || recurring.category.name}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {recurring.category.icon} {recurring.category.name} · ทุกวันที่{" "}
                  {recurring.dayOfMonth}
                </p>
              </div>
              <p
                className={`font-heading font-bold ${
                  isIncome ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isIncome ? "+" : "-"}
                {formatBaht(recurring.amount)}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
