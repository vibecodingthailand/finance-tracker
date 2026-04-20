import type { AuthResponse, UserProfile } from "@finance-tracker/shared";
import { apiRequest } from "./api";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export function loginRequest(input: LoginInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function registerRequest(input: RegisterInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function fetchProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/auth/me");
}
