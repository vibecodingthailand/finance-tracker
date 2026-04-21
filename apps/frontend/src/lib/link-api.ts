import type { LinkCodeResponse } from "@finance-tracker/shared";
import { apiRequest } from "./api";

export function requestLinkCode(): Promise<LinkCodeResponse> {
  return apiRequest<LinkCodeResponse>("/link/code", { method: "POST" });
}
