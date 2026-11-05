import { BrandMark } from '../../components/BrandMark';
import { Link, Navigate } from 'react-router';
import { useAuth } from './auth-context';
import { LoadingScreen } from '../../app/LoadingScreen';
import { readPendingInvitation } from '../workspaces/invitation-state';
export function CallbackPage() {
  const auth = useAuth();
  if (auth.status === 'loading') return <LoadingScreen />;
  if (auth.status === 'authenticated')
    return <Navigate replace to={readPendingInvitation() ? '/invite' : '/app'} />;
  return (
    <main className="center-page">
      <section className="glass message-panel">
        <BrandMark />
        <h1>Let’s try that again.</h1>
        <p role="alert">
          {auth.error ??
            'Google sign-in was cancelled or could not finish. Return to sign-in to try again.'}
        </p>
        <Link className="button button-primary" to="/auth">
          Return to sign-in
        </Link>
      </section>
    </main>
  );
}
