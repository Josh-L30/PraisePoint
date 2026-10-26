import { Link } from 'react-router';
import { ArrowRight, Presentation, Music, MonitorPlay, ShieldCheck } from 'lucide-react';
export function DashboardPage({ workspaceId }: { workspaceId?: string }) {
  const base = workspaceId ? '/app/w/' + workspaceId : '/app';
  return <div className="page-content">
    <header className="page-heading"><div><h1>A little preparation.<br />A meaningful Sunday.</h1><p>Your next service, all in one place.</p></div></header>
    <section className="welcome-panel glass">
      <div className="welcome-copy"><span className="quiet-label"><ShieldCheck size={16} /> Your private workspace</span>
        <h2>A place for your next service.</h2><p>Your songs, slides, and service plans will live here. Your personal work stays private until you choose to share it.</p>
        <Link className="button button-primary" to={base + '/decks'}><Presentation size={17} /> Open presentations <ArrowRight size={15} /></Link>
      </div>
      <div className="worship-art" aria-label="Abstract teal landscape"><div className="worship-art-copy"><span>Prepare with care</span><strong>Bring clarity<br />to worship.</strong></div></div>
    </section>
    <div className="section-heading"><h2>Make room for what matters.</h2><span className="muted">Your workspace is ready</span></div>
    <div className="getting-started">
      <article><span className="feature-icon"><Presentation /></span><h3>Prepare your slides</h3><p>Consistent layouts for lyrics, Scripture, messages, and announcements.</p></article>
      <article><span className="feature-icon"><Music /></span><h3>Keep songs together</h3><p>A reusable library for the songs your church loves to sing.</p></article>
      <article><span className="feature-icon"><MonitorPlay /></span><h3>Present with confidence</h3><p>Clear operator controls with a distraction-free audience screen.</p></article>
    </div>
    <footer className="workspace-footer">You’re in your personal workspace. Shared church workspaces and presentation tools are being prepared.</footer>
  </div>;
}
