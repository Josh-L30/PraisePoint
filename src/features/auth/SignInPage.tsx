import {BrandMark} from '../../components/BrandMark';
import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, MonitorPlay, Music, Presentation } from 'lucide-react';
import './sign-in.css';
import type { AuthService } from './auth-service';
export function SignInPage({ service, initialError }: { service: AuthService; initialError?: string | null }) {
  const [error, setError] = useState(initialError ?? '');
  const [busy, setBusy] = useState(false);
  async function signIn() {
    setError(''); setBusy(true);
    const result = await service.signInWithGoogle();
    if (!result.ok) { setError(result.error.message); setBusy(false); }
    else { setBusy(false); }
  }
  return <main className="open-welcome">
    <header className="open-welcome-brand"><Link className="brand" to="/" aria-label="PraisePoint home"><BrandMark/><strong>PraisePoint</strong></Link></header>
    <div className="open-welcome-panels"><section className="open-welcome-story" aria-labelledby="login-headline">
      <h1 id="login-headline">Prepare with care.<br />Lead with clarity.</h1>
      <ul className="open-welcome-features" aria-label="Presentation features"><li><Presentation size={20} aria-hidden="true"/>Slides</li><li><Music size={20} aria-hidden="true"/>Songs</li><li><MonitorPlay size={20} aria-hidden="true"/>Present</li></ul>
      <p>Beautiful slides. Familiar songs.<br />More space to focus on what matters.</p>
    </section>
    <section className="open-welcome-signin" aria-labelledby="login-welcome">
      <h2 id="login-welcome">Welcome to PraisePoint.</h2><p className="open-welcome-intro">Your songs, your slides, your next service.<br />Let’s bring them together.</p>
      <button className="google-button" onClick={() => { void signIn(); }} disabled={busy}><span className="google-mark" aria-hidden="true">G</span>{busy ? 'Connecting to Google…' : 'Continue with Google'}<ArrowUpRight size={16} /></button>
      {error && <div className="form-error" role="alert"><p>{error}</p><Link to="/setup">View connection help</Link></div>}
      <p className="open-welcome-privacy">Your personal work stays private.<br />Share with your church when you’re ready.</p>
    </section></div>
    <p className="open-welcome-footer">Made for the people behind every service.</p>
  </main>;
}
