import { worshipBackgrounds as backgrounds, type WorshipBackground } from './worship-backgrounds';
import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Image, Film } from 'lucide-react';
import type { Workspace } from '../workspaces/workspace-service';

function BackgroundPreview({ item }: { item: WorshipBackground }) {
  const [failed, setFailed] = useState(false),
    [loaded, setLoaded] = useState(false);
  return (
    <div className="background-preview">
      {failed ? (
        <p>Preview unavailable. Open the source to view this background.</p>
      ) : (
        <img
          src={item.preview}
          alt={item.title}
          width={640}
          height={360}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      <span>
        {item.kind === 'video' ? <Film size={15} /> : <Image size={15} />}
        <span>{item.kind === 'video' ? 'Video' : 'Image'}</span>
      </span>
      {!failed && !loaded && (
        <p className="background-preview-loading" aria-hidden="true">
          Loading preview…
        </p>
      )}
    </div>
  );
}
export function BackgroundGalleryPage({ workspace }: { workspace: Workspace }) {
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  return (
    <div className="page-content background-gallery">
      <header className="page-heading library-heading">
        <div>
          <h1>Backgrounds for worship.</h1>
          <p>Worship stills and motion loops from free church-media libraries.</p>
        </div>
        <Link className="button button-primary" to={'/app/w/' + workspace.id + '/media'}>
          Import downloaded media
        </Link>
      </header>
      <details className="background-guide">
        <summary>How to use a background</summary>
        <ol>
          <li>Open a provider page, find the named background and download a suitable size.</li>
          <li>
            Import the file into Media library, then choose it in your presentation’s background
            settings.
          </li>
          <li>Prepare the service on this laptop before presenting offline.</li>
        </ol>
        <p className="field-help">
          Choose images up to 1920 × 1080 and 5 MiB, or MP4 videos up to 128 MiB. Keep videos on
          this laptop. Previews need internet; viewing them does not upload files to your workspace.
        </p>
      </details>
      <div className="background-filters action-row" role="group" aria-label="Background type">
        {(
          [
            ['all', 'All backgrounds'],
            ['image', 'Still images'],
            ['video', 'Moving backgrounds'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={'button' + (filter === value ? ' button-secondary' : '')}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="background-grid">
        {backgrounds
          .filter((item) => filter === 'all' || item.kind === filter)
          .map((item) => (
            <article className="background-card glass" key={item.id}>
              <BackgroundPreview item={item} />
              <div className="background-card-content">
                <h2>{item.title}</h2>
                <p>{item.detail}</p>
                <p>{item.provider}</p>
                <a
                  className="button"
                  href={item.source}
                  aria-label={'View ' + item.title + ' on ' + item.provider}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.kind === 'video' ? 'Watch and download' : 'View and download'}
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </article>
          ))}
      </div>
      <section className="worship-sources" aria-label="More free worship media">
        <h2>More free worship media</h2>
        <p>
          Browse the providers’ free collections and check each item’s usage terms before
          downloading.
        </p>
        <div className="action-row">
          <a
            className="button"
            href="https://www.churchmotiongraphics.com/free-worship-media/"
            target="_blank"
            rel="noopener noreferrer"
          >
            CMG free worship media
            <ArrowUpRight size={16} />
          </a>
          <a
            className="button"
            href="https://www.visualrevival.com/product-categories/free-media/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visual Revival free motions
            <ArrowUpRight size={16} />
          </a>
          <a
            className="button"
            href="https://www.motionworship.com/free-church-media-012521/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Motion Worship free pack
            <ArrowUpRight size={16} />
          </a>
          <a
            className="button"
            href="https://live.churchmediadrop.com/downloads/worship-hands/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Worship Hands download
            <ArrowUpRight size={16} />
          </a>
          <a
            className="button"
            href="https://www.churchraise.ai/free-resources/service-backgrounds"
            target="_blank"
            rel="noopener noreferrer"
          >
            ChurchRaise stills & usage terms
            <ArrowUpRight size={16} />
          </a>
        </div>
        <p className="field-help">
          Some provider collections may ask you to sign in. PraisePoint does not resell or rehost
          original downloads.
        </p>
      </section>
    </div>
  );
}
