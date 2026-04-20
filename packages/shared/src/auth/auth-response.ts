import { UserProfile } from "./user-profile";

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}
