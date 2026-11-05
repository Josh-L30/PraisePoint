import { markRuntimeBusy } from '../offline/runtime-client';
import { useEffect } from 'react';
import { useBlocker } from 'react-router';
import { Modal, useConfirmation } from '../../components/Modal';
import { deferAccountChange } from '../../lib/navigation-guard';
export function useContentGuard(dirty: boolean, busy: boolean) {
  const { confirm, dialog } = useConfirmation();
  const blocker = useBlocker(dirty || busy);
  useEffect(() => {
    if (dirty || busy) return markRuntimeBusy();
  }, [dirty, busy]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty || busy) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const account = (event: Event) => {
      if (busy) event.preventDefault();
      else if (dirty)
        deferAccountChange(
          event,
          confirm({
            title: 'Discard unsaved changes?',
            message: 'Your unsaved changes will be discarded when you sign out.',
            confirmLabel: 'Discard and sign out',
            danger: true,
          }),
        );
    };
    window.addEventListener('beforeunload', unload);
    window.addEventListener('gather-before-account-change', account);
    return () => {
      window.removeEventListener('beforeunload', unload);
      window.removeEventListener('gather-before-account-change', account);
    };
  }, [dirty, busy, confirm]);
  useEffect(() => {
    if (blocker.state === 'blocked' && !dirty && !busy) blocker.proceed();
  }, [blocker, dirty, busy]);
  return (
    <>
      {dialog}
      {blocker.state === 'blocked' ? (
        <Modal
          className="confirmation-panel"
          aria-label="Unsaved changes"
          busy={busy}
          onCancel={() => blocker.reset()}
        >
          <h2>Keep your changes?</h2>
          <p>
            {busy
              ? 'Wait for the save to finish.'
              : 'This page has unsaved changes. Leaving discards this draft.'}
          </p>
          <div className="action-row">
            <button className="button" onClick={() => blocker.reset()}>
              Stay here
            </button>
            <button className="button" disabled={busy} onClick={() => blocker.proceed()}>
              Discard and leave
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
