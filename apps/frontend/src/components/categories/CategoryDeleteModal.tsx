import { useEffect, useState } from "react";
import type { CategoryResponse } from "@finance-tracker/shared";
import { ApiError } from "../../lib/api";
import { deleteCategory } from "../../lib/categories-api";
import { Button } from "../ui/Button";
import { FormAlert } from "../ui/FormAlert";
import { Modal } from "../ui/Modal";

interface CategoryDeleteModalProps {
  isOpen: boolean;
  category: CategoryResponse | null;
  onClose: () => void;
  onDeleted: () => void;
}

const CONFLICT_MESSAGE =
  "มี transaction ใช้หมวดนี้อยู่ ย้าย transaction ไปหมวดอื่นก่อน";

export function CategoryDeleteModal({
  isOpen,
  category,
  onClose,
  onDeleted,
}: CategoryDeleteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) setError(null);
  }, [isOpen]);

  async function handleConfirm() {
    if (!category) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await deleteCategory(category.id);
      onDeleted();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(CONFLICT_MESSAGE);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("ลบไม่สำเร็จ");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="ยืนยันการลบ"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={isSubmitting}
            className="bg-rose-500 text-zinc-50 hover:bg-rose-400 focus:ring-rose-500/50"
          >
            ลบหมวด
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <FormAlert>{error}</FormAlert> : null}

        <p className="text-sm text-zinc-300">
          คุณแน่ใจว่าต้องการลบหมวดนี้? การลบไม่สามารถย้อนกลับได้
        </p>

        {category ? (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <span className="text-2xl" aria-hidden="true">
              {category.icon}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-100">
                {category.name}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
