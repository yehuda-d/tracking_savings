export const queryKeys = {
  household: ['household'] as const,
  members: ['members'] as const,
  savings: ['savings'] as const,
  saving: (id: string) => ['saving', id] as const,
  transactions: (savingId: string) => ['transactions', savingId] as const,
};
