import {BrandMark} from '../../components/BrandMark';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { LoadingScreen } from '../../app/LoadingScreen';
import { captureInvitation, clearPendingInvitation } from './invitation-state';
import { workspaceService, type WorkspaceService } from './workspace-service';
import type { Result } from '../../domain/result';
export function AcceptInvitePage({ service = workspaceService }: { service?: WorkspaceService }) {
  const auth = useAuth(), navigate = useNavigate();
  const [invitation,setInvitation] = useState<Result<string> | null>(null);
  const [error,setError] = useState<string | null>(null), [busy,setBusy] = useState(false);
  const writing = useRef(false), mounted = useRef(true);
  useEffect(() => {
    mounted.current=true;
    queueMicrotask(() => { if (mounted.current) setInvitation(captureInvitation()); });
    return () => { mounted.current=false; };
  },[]);
  async function join() {
    if (!invitation?.ok || writing.current) return;
    writing.current=true; setBusy(true); setError(null);
    try {
      const result = await service.acceptInvite(invitation.value);
      if (!mounted.current) return;
      if (!result.ok) { setError(result.error.message); return; }
      clearPendingInvitation(); navigate('/app/w/' + result.value + '/team',{ replace: true });
    } catch { if (mounted.current) setError('Joining could not be confirmed. Check your connection and try again.'); }
    finally { writing.current=false; if (mounted.current) setBusy(false); }
  }
  if (!invitation || auth.status==='loading') return <LoadingScreen />;
  return <main className="center-page"><section className="glass message-panel invitation-page">
    <BrandMark/><h1>Prepare together.</h1>
    <p>Join your church’s shared workspace using the Google account your owner invited.</p>
    {error && <p className="form-message form-error" role="alert">{error}</p>}
    {!invitation.ok ? <p role="alert">{invitation.error.message}</p> : auth.status==='authenticated' ? <>
      <p>Signed in as <strong><bdi>{auth.profile.displayName}</bdi></strong>. Your name and profile picture will be visible to this church’s volunteers. Your personal work stays private.</p>
      <button className="button button-primary" disabled={busy} onClick={() => void join()}>{busy ? 'Joining…' : 'Join church workspace'}</button>
      <button className="button" disabled={busy} onClick={async () => {
        if (writing.current) return;
        writing.current=true; setBusy(true);
        try { await auth.signOut(); if (mounted.current) navigate('/auth'); }
        catch { if (mounted.current) setError('Sign-out could not finish. Try again.'); }
        finally { writing.current=false; if (mounted.current) setBusy(false); }
      }}>Use another Google account</button>
    </> : <Link className="button button-primary" to="/auth">Sign in with Google</Link>}
    <Link className="text-button" to={auth.status==='authenticated' ? '/app' : '/auth'} onClick={() => clearPendingInvitation()}>Discard invitation and return</Link>
  </section></main>;
}
