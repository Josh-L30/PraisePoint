// Database enforcement lives in the workspace migration and save RPCs.
export const LIMITS = {
  nameCharacters: 120, emailCharacters: 254, createdChurchesPerAccount: 1,
  invitationsPerHour: 10, invitationDays: 7, contentWritesPerMinute: 120,
} as const;
export const INVITATION_TOKEN_PATTERN = /^[0-9a-f]{64}$/;
