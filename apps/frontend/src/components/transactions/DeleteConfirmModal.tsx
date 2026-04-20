import { useState } from "react";
import type { TransactionResponse } from "@finance-tracker/shared";
import { TransactionType } from "@finance-tracker/shared";
import { ApiError } from "../../lib/api";
import { deleteTransaction } from "../../lib/transactions-api";
import { Button } from "../ui/Button";
import { FormAlert } from "../ui/FormAlert";
import { Modal } from "../ui/Modal";
import { formatBaht, formatThaiDate } from "../../lib/format";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  transaction: TransactionResponse | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  transaction,
  onClose,
  onDeleted,
}: DeleteConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!transaction) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await deleteTransaction(transaction.id);
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

  const isIncome = transaction?.type === TransactionType.INCOME;

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
            ลบรายการ
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <FormAlert>{error}</FormAlert> : null}

        <p className="text-sm text-zinc-300">
          คุณแน่ใจว่าต้องการลบรายการนี้? การลบไม่สามารถย้อนกลับได้
        </p>

        {transaction ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-100">
                  {transaction.description || transaction.category.name}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {transaction.category.icon} {transaction.category.name} ·{" "}
                  {formatThaiDate(transaction.createdAt)}
                </p>
              </div>
              <p
                className={`font-heading font-bold ${
                  isIncome ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isIncome ? "+" : "-"}
                {formatBaht(transaction.amount)}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
