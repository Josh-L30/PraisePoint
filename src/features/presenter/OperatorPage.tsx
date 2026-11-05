import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { ServiceSnapshot } from '../../domain/service';
import { serviceService } from '../services/service-service';
import { createMediaService } from '../media/media-service';
import { acquireRuntimeActivity } from '../offline/runtime-client';
import { verifyPresentationFont } from '../offline/readiness';
import { PresenterConsole } from './PresenterConsole';
export function OperatorPage({ profileId, serviceId }: { profileId: string; serviceId: string }) {
  const [snapshot, setSnapshot] = useState<ServiceSnapshot | null>(null),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState('Verifying your service…');
  const media = useMemo(() => createMediaService(profileId), [profileId]);
  useEffect(() => {
    let active = true,
      release: (() => void) | undefined;
    void (async () => {
      const lease = await acquireRuntimeActivity();
      if (!lease.ok) {
        if (active) setError(lease.error.message);
        return;
      }
      if (!active) {
        lease.value();
        return;
      }
      release = lease.value;
      const result = await serviceService.buildServiceSnapshot(serviceId);
      if (!active) return;
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      const font = await verifyPresentationFont();
      if (!active) return;
      if (!font.ok) {
        setError(font.error.message);
        return;
      }
      for (let i = 0; i < result.value.media.length; i++) {
        setLoading('Verifying file ' + (i + 1) + ' of ' + result.value.media.length + '…');
        const asset = result.value.media[i],
          verified = await media.verifyMedia(asset.id);
        if (!active) return;
        if (!verified.ok) {
          setError(asset.originalName + ': ' + verified.error.message);
          return;
        }
        if (
          (
            [
              'id',
              'workspaceId',
              'sha256',
              'bytes',
              'mime',
              'kind',
              'location',
              'revision',
            ] as const
          ).some((key) => verified.value[key] !== asset[key])
        ) {
          setError('A file differs from the saved service. Review it again before presenting.');
          return;
        }
      }
      setSnapshot(result.value);
    })().catch(() => {
      if (active) setError('The service could not be verified. Reconnect and reopen it.');
    });
    return () => {
      active = false;
      release?.();
    };
  }, [profileId, serviceId, media]);
  return snapshot ? (
    <PresenterConsole profileId={profileId} snapshot={snapshot} resolveMedia={media.resolveMedia} />
  ) : (
    <main className="center-page">
      <section className="glass message-panel">
        <h1>Preparing your service.</h1>
        {error ? <p role="alert">{error}</p> : <p role="status">{loading}</p>}
        <Link className="button" to="/app">
          Return to workspace
        </Link>
      </section>
    </main>
  );
}
