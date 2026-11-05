import { createContext, useContext } from 'react';
import type { AuthService, ProfileWorkspace } from './auth-service';
export type AuthState =
  | { status: 'loading' | 'anonymous'; profile: null; error: null }
  | { status: 'authenticated'; profile: ProfileWorkspace; error: null }
  | { status: 'error'; profile: null; error: string };
export type AuthContextValue = AuthState & {
  service: AuthService;
  reload(): Promise<void>;
  signOut(): Promise<void>;
};
export const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required.');
  return value;
}
