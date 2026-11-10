import { BrandMark } from '../../components/BrandMark';
import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, MonitorPlay, Music, Presentation } from 'lucide-react';
import './sign-in.css';
import type { AuthService } from './auth-service';
export function SignInPage({
  service,
  initialError,
}: {
  service: AuthService;
  initialError?: string | null;
}) {
  const [error, setError] = useState(initialError ?? '');
  const [busy, setBusy] = useState(false);
  async function signIn() {
    setError('');
    setBusy(true);
    const result = await service.signInWithGoogle();
    if (!result.ok) {
      setError(result.error.message);
      setBusy(false);
    } else {
      setBusy(false);
    }
  }
  return (
    <main className="open-welcome">
      <header className="open-welcome-brand">
        <Link className="brand" to="/" aria-label="PraisePoint home">
          <BrandMark />
          <strong>PraisePoint</strong>
        </Link>
      </header>
      <div className="open-welcome-panels">
        <section className="open-welcome-story" aria-labelledby="login-headline">
          <h1 id="login-headline">
            Prepare with care.
            <br />
            Lead with clarity.
          </h1>
          <ul className="open-welcome-features" aria-label="Presentation features">
            <li>
              <Presentation size={20} aria-hidden="true" />
              Slides
            </li>
            <li>
              <Music size={20} aria-hidden="true" />
              Songs
            </li>
            <li>
              <MonitorPlay size={20} aria-hidden="true" />
              Present
            </li>
          </ul>
          <p>
            Beautiful slides. Familiar songs.
            <br />
            More space to focus on what matters.
          </p>
        </section>
        <section className="open-welcome-signin" aria-labelledby="login-welcome">
          <h2 id="login-welcome">
            Welcome to
            <br className="welcome-break" /> PraisePoint.
          </h2>
          <p className="open-welcome-intro">
            Your songs, your slides, your next service.
            <br />
            Let’s bring them together.
          </p>
          <button
            className="google-button"
            onClick={() => {
              void signIn();
            }}
            disabled={busy}
          >
            <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285f4"
                d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.6Z"
              />
              <path
                fill="#34a853"
                d="M12 22c2.7 0 5-.9 6.7-2.5l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H2.9v2.7A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#fbbc05"
                d="M6.3 13.7a6 6 0 0 1 0-3.4V7.6H2.9a10 10 0 0 0 0 8.8l3.4-2.7Z"
              />
              <path
                fill="#ea4335"
                d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9.1 5.6l3.4 2.7A6 6 0 0 1 12 6.1Z"
              />
            </svg>
            <span className="google-label">
              {busy ? 'Connecting to Google…' : 'Continue with Google'}
            </span>
            <ArrowUpRight className="google-arrow" size={17} aria-hidden="true" />
          </button>
          {error && (
            <div className="form-error" role="alert">
              <p>{error}</p>
              <Link to="/setup">View connection help</Link>
            </div>
          )}
          <p className="open-welcome-privacy">
            Your personal work stays private.
            <br />
            Share with your church when you’re ready.
          </p>
        </section>
      </div>
      <p className="open-welcome-footer">Made for the people behind every service.</p>
    </main>
  );
}
