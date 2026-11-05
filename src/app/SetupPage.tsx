import { Link } from 'react-router';
export function SetupPage() {
  return (
    <main className="center-page">
      <section className="glass setup-panel">
        <Link to="/auth" className="text-link">
          Back to sign-in
        </Link>
        <h1>Connect Google sign-in.</h1>
        <p>
          This step is for the website administrator. Volunteers will only need their Google
          accounts.
        </p>
        <ol>
          <li>Create a Google OAuth web application in Google Auth Platform.</li>
          <li>
            Add this website’s origin and the Supabase callback address listed in the setup guide.
          </li>
          <li>
            Save its client ID and secret in Supabase’s Google provider settings. Keep the secret
            out of the website files.
          </li>
          <li>Allow the website’s sign-in callback address in Supabase, then test sign-in.</li>
        </ol>
        <p>
          Google sign-in is configured for local development. The administrator must update the
          allowed addresses when the website is published.
        </p>
        <a
          className="button button-primary"
          href="https://supabase.com/dashboard/project/tnrmotwiarlpknamxoyp/auth/providers?provider=Google"
          target="_blank"
          rel="noreferrer"
        >
          Open Google provider settings
        </a>
        <p className="small muted">
          Administrator details and exact addresses are in docs/setup.md in the project folder.
        </p>
      </section>
    </main>
  );
}
