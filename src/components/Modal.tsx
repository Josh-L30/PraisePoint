import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type ModalProps = Omit<HTMLAttributes<HTMLDialogElement>, 'onCancel' | 'role'> & {
  onCancel?(): void;
  busy?: boolean;
  role?: 'dialog' | 'alertdialog';
};
/** The native top layer keeps dialogs centered above transformed glass panels. */
export function Modal({
  children,
  className = '',
  onCancel,
  busy = false,
  role = 'dialog',
  ...props
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current,
      previous = document.activeElement as HTMLElement | null;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    (dialog.querySelector<HTMLElement>('[data-modal-initial-focus]') ?? dialog).focus();
    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <dialog
      {...props}
      ref={ref}
      tabIndex={-1}
      className={'app-modal ' + className}
      role={role}
      aria-modal="true"
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel?.();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) onCancel?.();
        }
        if (event.key === 'Tab') {
          const controls = ref.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]',
          );
          if (!controls?.length) {
            event.preventDefault();
            return;
          }
          const first = controls[0],
            last = controls[controls.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === first || document.activeElement === ref.current)
          ) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            (document.activeElement === last || document.activeElement === ref.current)
          ) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
    >
      {children}
    </dialog>,
    document.body,
  );
}

type Confirmation = { title: string; message: ReactNode; confirmLabel?: string; danger?: boolean };
export function useConfirmation() {
  const [request, setRequest] = useState<Confirmation | null>(null),
    resolve = useRef<((value: boolean) => void) | null>(null);
  const confirm = useCallback((options: Confirmation) => {
    if (resolve.current) return Promise.resolve(false);
    return new Promise<boolean>((done) => {
      resolve.current = done;
      setRequest(options);
    });
  }, []);
  const finish = useCallback((accepted: boolean) => {
    const done = resolve.current;
    resolve.current = null;
    setRequest(null);
    done?.(accepted);
  }, []);
  useEffect(
    () => () => {
      resolve.current?.(false);
      resolve.current = null;
    },
    [],
  );
  const dialog = request ? (
    <Modal
      role="alertdialog"
      aria-label={request.title}
      onCancel={() => finish(false)}
      className="confirmation-panel"
    >
      <h2>{request.title}</h2>
      <p>{request.message}</p>
      <div className="action-row">
        <button data-modal-initial-focus className="button" onClick={() => finish(false)}>
          Cancel
        </button>
        <button
          className={'button ' + (request.danger ? 'button-danger' : 'button-primary')}
          onClick={() => finish(true)}
        >
          {request.confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </Modal>
  ) : null;
  return { confirm, dialog };
}
