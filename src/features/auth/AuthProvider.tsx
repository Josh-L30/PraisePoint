import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {setThemeAccess} from '../../lib/theme';
import { AuthContext, type AuthState } from './auth-context';
import { authService, type AuthService } from './auth-service';
export function AuthProvider({ children, service = authService }: { children: ReactNode; service?: AuthService }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', profile: null, error: null });
  const generation = useRef(0);
  useLayoutEffect(()=>{setThemeAccess(state.status==='authenticated');},[state.status]);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    const session = await service.getSession();
    if (current !== generation.current) return;
    if (!session.ok) { setState({ status: 'error', profile: null, error: session.error.message }); return; }
    if (!session.value) { setState({ status: 'anonymous', profile: null, error: null }); return; }
    const result = await service.finishSignIn();
    if (current !== generation.current) return;
    setState(result.ok ? { status: 'authenticated', profile: result.value, error: null }
      : { status: 'error', profile: null, error: result.error.message });
  }, [service]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void reload(); });
    const unsubscribe = service.subscribe(() => { if (active) void reload(); });
    return () => { active = false; invalidate(); unsubscribe(); };
  }, [reload, service, invalidate]);
  const signOut = useCallback(async () => {
    generation.current++;
    const result = await service.signOut();
    if (result.ok) setState({ status: 'anonymous', profile: null, error: null });
    else setState({ status: 'error', profile: null, error: result.error.message });
  }, [service]);
  return <AuthContext.Provider value={{ ...state, service, reload, signOut }}>{children}</AuthContext.Provider>;
}
