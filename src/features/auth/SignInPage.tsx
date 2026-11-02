import {BrandMark} from '../../components/BrandMark';
import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { ShieldCheck, ArrowUpRight, MonitorPlay, Music, Presentation } from 'lucide-react';
import {LoginEntrance} from './LoginEntrance';
import {shouldPlayLoginEntrance} from './login-entrance-policy';
import type { AuthService } from './auth-service';
export function SignInPage({ service, initialError }: { service: AuthService; initialError?: string | null }) {
  const [error, setError] = useState(initialError ?? '');
  const [busy, setBusy] = useState(false);
  const [entrance, setEntrance] = useState(() => !initialError && shouldPlayLoginEntrance());
  const finishEntrance = useCallback(() => setEntrance(false), []);
  async function signIn() {
    setError(''); setBusy(true);
    const result = await service.signInWithGoogle();
    if (!result.ok) { setError(result.error.message); setBusy(false); }
    else { setBusy(false); }
  }
  if (entrance) return <LoginEntrance onComplete={finishEntrance}/>;
  return <main className="auth-layout">
    <section className="auth-story"><Link className="brand" to="/" aria-label="PraisePoint home"><BrandMark/><span><strong>PraisePoint</strong><small>Church presentation workspace</small></span></Link>
      <div className="story-copy"><span className="story-tag"><span aria-hidden="true" /> A space for worship</span><h1>Prepare with care.<br />Lead with clarity.</h1>
        <p>Beautiful slides. Familiar songs.<br />More space to focus on what matters.</p>
        <div className="story-tools" aria-label="Presentation features"><span><Presentation size={17} />Slides</span><span><Music size={17} />Songs</span><span><MonitorPlay size={17} />Present</span></div>
      </div><p className="story-footer">Made for the people behind every service.</p>
    </section>
    <section className="auth-form-area"><div className="auth-card glass">
      <h2>Welcome to PraisePoint.</h2><p className="auth-intro">Your songs, your slides, your next service.<br />Let’s bring them together.</p>
      <button className="google-button" onClick={() => { void signIn(); }} disabled={busy}><span className="google-mark" aria-hidden="true">G</span>{busy ? 'Connecting to Google…' : 'Continue with Google'}<ArrowUpRight size={16} /></button>
      {error && <div className="form-error" role="alert"><p>{error}</p><Link to="/setup">View connection help</Link></div>}
      <p className="auth-caption">One Google account. Your own private workspace.</p><div className="auth-divider" />
      <div className="privacy-note"><ShieldCheck size={20} /><p>Your personal work stays private.<br /><span>Share with your church when you’re ready.</span></p></div>
    </div><div className="auth-free-note"><span aria-hidden="true">✦</span> Created for worship. Free to use.</div></section>
  </main>;
}
