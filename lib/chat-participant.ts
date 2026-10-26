type ChatApplication = {
  goalkeeper_id: string;
  matches: { created_by: string } | null;
};

export function isChatParticipant(application: ChatApplication, userId: string): boolean {
  return application.matches !== null &&
    (application.goalkeeper_id === userId || application.matches.created_by === userId);
}
