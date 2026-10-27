// Database enforcement lives in the workspace migration and save RPCs.
export const LIMITS = {
  editorHistoryEntries: 50, editorHistoryBytes: 16 * 1024 * 1024,
  slidesPerDeck: 200, elementsPerSlide: 100, textCharacters: 20000, documentBytes: 2 * 1024 * 1024,
  workspaceDocumentBytes: 25 * 1024 * 1024, applicationDocumentBytes: 100 * 1024 * 1024,
  nameCharacters: 120, emailCharacters: 254, createdChurchesPerAccount: 1,
  invitationsPerHour: 10, invitationDays: 7, contentWritesPerMinute: 120,
} as const;
export const INVITATION_TOKEN_PATTERN = /^[0-9a-f]{64}$/;
