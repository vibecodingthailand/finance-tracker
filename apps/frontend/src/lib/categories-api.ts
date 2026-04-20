import type {
  CategoryResponse,
  TransactionType,
} from "@finance-tracker/shared";
import { apiRequest } from "./api";

export interface CreateCategoryInput {
  name: string;
  icon: string;
  type: TransactionType;
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
}

export function fetchCategories(): Promise<CategoryResponse[]> {
  return apiRequest<CategoryResponse[]>("/categories");
}

export function createCategory(
  input: CreateCategoryInput,
): Promise<CategoryResponse> {
  return apiRequest<CategoryResponse>("/categories", {
    method: "POST",
    body: input,
  });
}

export function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryResponse> {
  return apiRequest<CategoryResponse>(`/categories/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteCategory(id: string): Promise<void> {
  return apiRequest<void>(`/categories/${id}`, {
    method: "DELETE",
  });
}
