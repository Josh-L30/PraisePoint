import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
const names: Record<string, string> = { decks: 'Presentations', songs: 'Song library', services: 'Service plans', media: 'Media library', templates: 'Templates', team: 'Church workspace' };
export function FeaturePendingPage() {
  const { section } = useParams();
  return <section className="glass empty-panel"><h1>{names[section ?? ''] ?? 'Workspace'}</h1>
    <p>This part of the workspace is still being prepared. Your account is connected; creating and presenting slides will be available when these tools are ready.</p>
    <Link to="/app" className="button"><ArrowLeft size={16} />Back to overview</Link>
  </section>;
}
