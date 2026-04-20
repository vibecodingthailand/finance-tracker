import type {
  RecurringResponse,
  TransactionType,
} from "@finance-tracker/shared";
import { apiRequest } from "./api";

export interface CreateRecurringInput {
  amount: number;
  type: TransactionType;
  description?: string;
  categoryId: string;
  dayOfMonth: number;
}

export interface UpdateRecurringInput {
  amount?: number;
  type?: TransactionType;
  description?: string;
  categoryId?: string;
  dayOfMonth?: number;
  active?: boolean;
}

export function fetchRecurrings(): Promise<RecurringResponse[]> {
  return apiRequest<RecurringResponse[]>("/recurring");
}

export function createRecurring(
  input: CreateRecurringInput,
): Promise<RecurringResponse> {
  return apiRequest<RecurringResponse>("/recurring", {
    method: "POST",
    body: input,
  });
}

export function updateRecurring(
  id: string,
  input: UpdateRecurringInput,
): Promise<RecurringResponse> {
  return apiRequest<RecurringResponse>(`/recurring/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteRecurring(id: string): Promise<void> {
  return apiRequest<void>(`/recurring/${id}`, {
    method: "DELETE",
  });
}
