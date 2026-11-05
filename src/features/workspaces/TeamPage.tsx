import { Modal } from '../../components/Modal';
import { acquireRuntimeActivity, markRuntimeBusy } from '../offline/runtime-client';
import { purgeWorkspaceLocalData } from './workspace-local-cleanup';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Users, ShieldCheck, Link2, Copy, UserPlus } from 'lucide-react';
import {
  workspaceService,
  type Workspace,
  type WorkspaceService,
  type TeamMember,
  type Invitation,
} from './workspace-service';
import type { Result } from '../../domain/result';
import { LIMITS } from '../../domain/limits';
export type TeamPageProps = {
  workspace: Workspace;
  profileId: string;
  service?: WorkspaceService;
  onRefresh(): Promise<void>;
};
type Confirmation = { kind: 'transfer' | 'remove'; member: TeamMember } | { kind: 'leave' };
function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join('');
}
export function TeamPage({
  workspace,
  profileId,
  service = workspaceService,
  onRefresh,
}: TeamPageProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(''),
    [email, setEmail] = useState('');
  const [snapshot, setSnapshot] = useState<{
    members: TeamMember[];
    invitations: Invitation[];
    checkedAt: number;
  } | null>(null);
  const [loading, setLoading] = useState(workspace.kind === 'church');
  const [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null),
    [revision, setRevision] = useState(0);
  const [receipt, setReceipt] = useState<{
    url: string;
    expiresAt: string;
    recipient: string;
  } | null>(null);
  const [copyNotice, setCopyNotice] = useState(''),
    [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [deletingChurch, setDeletingChurch] = useState(false),
    [deleteName, setDeleteName] = useState('');
  const mounted = useRef(true),
    writing = useRef(false),
    linkRef = useRef<HTMLInputElement>(null),
    confirmationRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!busy) return;
    const release = markRuntimeBusy();
    const account = (event: Event) => event.preventDefault(),
      unload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = '';
      };
    window.addEventListener('gather-before-account-change', account);
    window.addEventListener('beforeunload', unload);
    return () => {
      release();
      window.removeEventListener('gather-before-account-change', account);
      window.removeEventListener('beforeunload', unload);
    };
  }, [busy]);
  useEffect(() => {
    if (confirmation) confirmationRef.current?.focus();
  }, [confirmation]);
  useEffect(() => {
    if (workspace.kind !== 'church') return;
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const team = await service.team(workspace.id);
        if (!active) return;
        if (!team.ok) {
          setSnapshot(null);
          setError(team.error.message);
          return;
        }
        const self = team.value.find((member) => member.userId === profileId);
        if (!self) {
          setSnapshot(null);
          setError('Your membership could not be verified. Refresh your workspaces.');
          return;
        }
        let invitations: Invitation[] = [];
        if (self.role === 'owner') {
          const result = await service.invitations(workspace.id);
          if (!active) return;
          if (result.ok) invitations = result.value;
          else setError(result.error.message);
        }
        setSnapshot({ members: team.value, invitations, checkedAt: Date.now() });
        if (self.role !== workspace.role) await onRefresh();
      } catch {
        if (active) setError('The team could not be loaded. Check your connection and try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [workspace.id, workspace.kind, workspace.role, profileId, service, onRefresh, revision]);
  const self = snapshot?.members.find((member) => member.userId === profileId);
  const canManage = workspace.role === 'owner' && self?.role === 'owner';
  async function perform<T>(
    operation: string,
    request: () => Promise<Result<T>>,
    success: (value: T) => Promise<void>,
  ) {
    if (writing.current) return;
    writing.current = true;
    setBusy(operation);
    setError(null);
    setNotice(null);
    try {
      const result = await request();
      if (!result.ok) {
        if (mounted.current) setError(result.error.message);
        if (result.error.code === 'FORBIDDEN') await onRefresh();
        return;
      }
      await success(result.value);
    } catch {
      if (mounted.current)
        setError('This change could not be confirmed. Refresh before trying again.');
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(null);
    }
  }
  async function changed(message: string) {
    await onRefresh();
    if (mounted.current) {
      setConfirmation(null);
      setNotice(message);
      setRevision((value) => value + 1);
    }
  }
  function confirmChange() {
    if (!confirmation) return;
    if (confirmation.kind === 'leave') {
      void perform(
        'leave',
        () => service.leaveChurch(workspace.id),
        async () => {
          if (mounted.current) navigate('/app');
          await onRefresh();
        },
      );
    } else if (confirmation.kind === 'transfer') {
      const member = confirmation.member;
      void perform(
        'transfer',
        () => service.transferOwner(workspace.id, member.userId),
        () => changed('Ownership transferred.'),
      );
    } else {
      const member = confirmation.member;
      void perform(
        'remove',
        () => service.removeMember(workspace.id, member.userId),
        () => changed('Volunteer removed from the church workspace.'),
      );
    }
  }
  async function deleteChurch() {
    if (!canManage || deleteName !== workspace.name || writing.current) return;
    void perform(
      'delete-workspace',
      async () => {
        const lease = await acquireRuntimeActivity('prepare');
        if (!lease.ok) return lease;
        try {
          const begun = await service.beginDeleteChurch(workspace.id, deleteName);
          if (!begun.ok) {
            await onRefresh();
            return begun;
          }
          const local = await purgeWorkspaceLocalData(profileId, workspace.id);
          if (!local.ok) {
            await onRefresh();
            return local;
          }
          const result = await service.deleteChurch(workspace.id, deleteName);
          if (!result.ok) await onRefresh();
          return result;
        } finally {
          lease.value();
        }
      },
      async () => {
        if (mounted.current) navigate('/app');
        await onRefresh();
      },
    );
  }
  return (
    <div className="page-content team-page" aria-busy={!!busy}>
      <header className="page-heading">
        <h1>Prepare together.</h1>
        <p>
          {workspace.kind === 'personal'
            ? 'A shared space for the people behind every service.'
            : workspace.name}
        </p>
      </header>
      {error && !confirmation && !deletingChurch && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="form-message form-success" role="status">
          {notice}
        </p>
      )}
      {workspace.kind === 'personal' ? (
        <div className="team-layout">
          <section className="team-card glass">
            <span className="feature-icon">
              <Users />
            </span>
            <h2>Create your church workspace.</h2>
            <p>
              Bring your volunteers into one shared space. Your personal work stays in your own
              workspace.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void perform(
                  'create',
                  () => service.createChurch(name),
                  async (id) => {
                    await onRefresh();
                    if (mounted.current) navigate('/app/w/' + id + '/team');
                  },
                );
              }}
            >
              <label className="field-label" htmlFor="church-name">
                Church name
              </label>
              <input
                className="field-input"
                id="church-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="organization"
                maxLength={LIMITS.nameCharacters}
                required
                disabled={!!busy}
              />
              <p className="field-help">
                Use the name your volunteers will recognize. You can create one church workspace per
                account.
              </p>
              <button className="button button-primary" disabled={!!busy}>
                {busy === 'create' ? 'Creating…' : 'Create church workspace'}
              </button>
            </form>
          </section>
          <aside className="team-card glass privacy-card">
            <ShieldCheck size={24} />
            <h2>Your own space stays yours.</h2>
            <p>
              Switch between your personal workspace and church workspaces using the menu on the
              left. Creating or joining a church never moves your personal slides.
            </p>
            <div className="team-note">
              <Link2 size={18} />
              <p>
                Already invited? Open the link your church owner shared and sign in with the invited
                Google account.
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="team-layout">
          <section className="team-card glass">
            <div className="card-heading">
              <h2>Your volunteers</h2>
              <span className="role-badge">{canManage ? 'Owner' : 'Shared workspace'}</span>
            </div>
            <p>Your church owner manages invitations and membership.</p>
            {loading ? (
              <p role="status" className="field-help">
                Loading volunteers…
              </p>
            ) : !snapshot ? (
              <button className="button" onClick={() => setRevision((value) => value + 1)}>
                Try again
              </button>
            ) : (
              <ul className="member-list">
                {snapshot.members.map((member) => (
                  <li className="member-row" key={member.userId}>
                    <span className="avatar">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" referrerPolicy="no-referrer" />
                      ) : (
                        initials(member.displayName)
                      )}
                    </span>
                    <div className="member-meta">
                      <strong>
                        <bdi>{member.displayName}</bdi>
                      </strong>
                      <small>
                        {member.role === 'owner' ? 'Owner' : 'Volunteer'}
                        {member.userId === profileId ? ' · You' : ''}
                      </small>
                    </div>
                    {canManage && !workspace.deletionPending && member.userId !== profileId && (
                      <div className="member-actions">
                        <button
                          className="text-button"
                          disabled={!!busy}
                          onClick={() => setConfirmation({ kind: 'transfer', member })}
                        >
                          Make owner
                        </button>
                        <button
                          className="text-button text-button-danger"
                          disabled={!!busy}
                          onClick={() => setConfirmation({ kind: 'remove', member })}
                        >
                          Remove volunteer
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!loading && self?.role === 'member' && (
              <button
                className="button button-quiet"
                disabled={!!busy}
                onClick={() => setConfirmation({ kind: 'leave' })}
              >
                Leave church workspace
              </button>
            )}
            {!loading && canManage && (
              <p className="field-help">
                Transfer ownership to another volunteer before leaving this workspace.
              </p>
            )}
            {confirmation && (
              <Modal
                className="confirmation-panel"
                aria-label="Confirm membership change"
                onCancel={() => setConfirmation(null)}
                busy={!!busy}
              >
                <h3 ref={confirmationRef} tabIndex={-1}>
                  {confirmation.kind === 'leave' ? (
                    'Leave this church workspace?'
                  ) : confirmation.kind === 'transfer' ? (
                    <>
                      Make <bdi>{confirmation.member.displayName}</bdi> the owner?
                    </>
                  ) : (
                    <>
                      Remove <bdi>{confirmation.member.displayName}</bdi>?
                    </>
                  )}
                </h3>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <p>
                  {confirmation.kind === 'transfer'
                    ? 'They will manage the church team. You will become a member.'
                    : confirmation.kind === 'leave'
                      ? 'You will lose access to this shared workspace. Your personal workspace stays yours.'
                      : 'They will lose access to this church workspace. Their personal work stays private.'}
                </p>
                <div className="action-row">
                  <button
                    className="button button-primary"
                    disabled={!!busy}
                    onClick={confirmChange}
                  >
                    {busy
                      ? 'Updating…'
                      : confirmation.kind === 'transfer'
                        ? 'Confirm transfer'
                        : confirmation.kind === 'remove'
                          ? 'Confirm removal'
                          : 'Confirm leaving'}
                  </button>
                  <button
                    className="button"
                    disabled={!!busy}
                    onClick={() => setConfirmation(null)}
                  >
                    Cancel
                  </button>
                </div>
              </Modal>
            )}
          </section>
          {canManage && !loading && !workspace.deletionPending ? (
            <section className="team-card glass">
              <span className="feature-icon">
                <UserPlus />
              </span>
              <h2>Invite a volunteer.</h2>
              <p>Create a link for their Google account, then share it with them yourself.</p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void perform(
                    'invite',
                    () => service.inviteMember(workspace.id, email),
                    async (value) => {
                      await onRefresh();
                      if (mounted.current) {
                        setReceipt({ ...value, recipient: email.trim().toLowerCase() });
                        setEmail('');
                        setCopyNotice('');
                        setRevision((current) => current + 1);
                      }
                    },
                  );
                }}
              >
                <label className="field-label" htmlFor="volunteer-email">
                  Volunteer email
                </label>
                <input
                  className="field-input"
                  id="volunteer-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={LIMITS.emailCharacters}
                  required
                  disabled={!!busy}
                />
                <p className="field-help">
                  Each link works once, for this email only, and expires in {LIMITS.invitationDays}{' '}
                  days. Up to {LIMITS.invitationsPerHour} links per hour.
                </p>
                <button className="button button-primary" disabled={!!busy}>
                  {busy === 'invite' ? 'Creating…' : 'Create invitation link'}
                </button>
              </form>
              {receipt && (
                <div className="invitation-receipt">
                  <label className="field-label" htmlFor="invitation-link">
                    Invitation link
                  </label>
                  <input
                    id="invitation-link"
                    className="field-input"
                    ref={linkRef}
                    readOnly
                    value={receipt.url}
                    onFocus={(event) => event.target.select()}
                  />
                  <p className="field-help">
                    Share with <bdi>{receipt.recipient}</bdi>. Expires{' '}
                    {dateLabel(receipt.expiresAt)}.
                  </p>
                  <button
                    className="button"
                    disabled={!!busy}
                    onClick={async () => {
                      try {
                        if (!navigator.clipboard) throw new Error('unavailable');
                        await navigator.clipboard.writeText(receipt.url);
                        setCopyNotice('Link copied.');
                      } catch {
                        linkRef.current?.focus();
                        linkRef.current?.select();
                        setCopyNotice('Select the link above and copy it.');
                      }
                    }}
                  >
                    <Copy size={16} />
                    Copy link
                  </button>
                  <span className="copy-status" role="status">
                    {copyNotice}
                  </span>
                </div>
              )}
              <div className="pending-invitations">
                <h3>Pending invitations</h3>
                {snapshot?.invitations.length ? (
                  <ul>
                    {snapshot.invitations.map((invitation) => (
                      <li key={invitation.id}>
                        <div>
                          <strong>
                            <bdi>{invitation.email}</bdi>
                          </strong>
                          <small>
                            {new Date(invitation.expiresAt).getTime() <= snapshot.checkedAt
                              ? 'Expired'
                              : 'Expires ' + dateLabel(invitation.expiresAt)}
                          </small>
                        </div>
                        <button
                          className="text-button"
                          disabled={!!busy}
                          onClick={() =>
                            void perform(
                              'revoke',
                              () => service.revokeInvite(workspace.id, invitation.id),
                              async () => {
                                if (mounted.current && receipt?.recipient === invitation.email)
                                  setReceipt(null);
                                await changed('Invitation revoked.');
                              },
                            )
                          }
                        >
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="field-help">No pending invitations.</p>
                )}
              </div>
            </section>
          ) : (
            <aside className="team-card glass privacy-card">
              <ShieldCheck size={24} />
              <h2>A shared space. Your own profile.</h2>
              <p>
                Your name and profile picture are visible to this church’s volunteers. Your personal
                workspace remains private.
              </p>
            </aside>
          )}
        </div>
      )}

      {workspace.kind === 'church' && canManage && !loading && (
        <section className="team-card glass workspace-danger">
          <h2>
            {workspace.deletionPending
              ? 'Workspace deletion is unfinished.'
              : 'Delete this church workspace.'}
          </h2>
          <p>
            {workspace.deletionPending
              ? 'The workspace is locked while its files are being removed. Resume to finish cleanup.'
              : 'This permanently removes this workspace and its presentations, songs, services, invitations and cloud images. Your personal workspace stays separate.'}
          </p>
          <button
            className="button button-danger"
            disabled={!!busy}
            onClick={() => {
              setError(null);
              setDeleteName('');
              setDeletingChurch(true);
            }}
          >
            {workspace.deletionPending ? 'Resume workspace deletion' : 'Delete church workspace'}
          </button>
        </section>
      )}
      {deletingChurch && (
        <Modal
          className="confirmation-panel"
          role="alertdialog"
          aria-label="Delete church workspace?"
          busy={!!busy}
          onCancel={() => setDeletingChurch(false)}
        >
          <h2>Delete church workspace?</h2>
          <p>
            <strong>{workspace.name}</strong>
          </p>
          <p>
            This permanently deletes all of this church workspace’s slides, songs, service plans,
            invitations, memberships and cloud images. Its saved copies in this browser are removed
            too. Personal work and original files on your laptop stay separate. Copies on other
            disconnected devices cannot be remotely erased.
          </p>
          <p>Once deletion starts it cannot be undone. If cleanup pauses, resume it here.</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <label className="field-label" htmlFor="delete-workspace-name">
            Type workspace name
          </label>
          <input
            id="delete-workspace-name"
            className="field-input"
            autoComplete="off"
            maxLength={120}
            disabled={!!busy}
            value={deleteName}
            onChange={(event) => setDeleteName(event.target.value)}
          />
          <p className="field-help">Enter {workspace.name} exactly to confirm.</p>
          <div className="action-row">
            <button className="button" disabled={!!busy} onClick={() => setDeletingChurch(false)}>
              {workspace.deletionPending ? 'Close' : 'Cancel'}
            </button>
            <button
              className="button button-danger"
              disabled={!!busy || deleteName !== workspace.name}
              onClick={() => void deleteChurch()}
            >
              {busy === 'delete-workspace'
                ? 'Deleting workspace and files…'
                : workspace.deletionPending
                  ? 'Resume deletion'
                  : 'Delete workspace'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
