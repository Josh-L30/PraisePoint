import {
  createWorkspaceService,
  type Workspace,
  type WorkspaceService,
  type TeamMember,
} from '../../../src/features/workspaces/workspace-service';
export const ownerId = '22222222-2222-4222-8222-222222222222';
export const memberId = '33333333-3333-4333-8333-333333333333';
export const personal: Workspace = {
  id: '44444444-4444-4444-8444-444444444444',
  kind: 'personal',
  name: 'Personal workspace',
  ownerId,
  role: 'owner',
};
export const church: Workspace = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'church',
  name: 'CCF team (test)',
  ownerId,
  role: 'owner',
};
export const members: TeamMember[] = [
  { userId: ownerId, displayName: 'Maria', avatarUrl: null, role: 'owner' },
  { userId: memberId, displayName: 'Daniel', avatarUrl: null, role: 'member' },
];
export function teamService(overrides: Partial<WorkspaceService> = {}): WorkspaceService {
  return {
    ...createWorkspaceService(null, 'https://gather.example'),
    team: async () => ({ ok: true, value: members.map((member) => ({ ...member })) }),
    invitations: async () => ({ ok: true, value: [] }),
    ...overrides,
  };
}
