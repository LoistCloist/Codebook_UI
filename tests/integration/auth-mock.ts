// Dependency-free stand-ins for the auth modules. Kept separate from helpers.ts on purpose:
// helpers imports the route handlers, which import the mocked modules, so a mock factory
// that imported helpers would deadlock on the import cycle.

export const auth = { hash: null as string | null, consent: true };

export const sessionMock = {
  getParticipantHash: async () => auth.hash,
  isAdmin: async () => false,
  requireAdmin: async () => {
    throw new Error("requireAdmin is not used by integration tests");
  },
};

export const consentMock = {
  CONSENT_COOKIE: "consent_intent",
  readConsentIntent: async () => auth.consent,
  setConsentIntent: async () => {},
  clearConsentIntent: async () => {},
};
