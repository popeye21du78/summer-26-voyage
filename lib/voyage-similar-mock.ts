/** Suggestions « ville du même voyage » pour échange (mock) */
export function otherStepIdsForSwap(
  currentId: string,
  allIds: string[]
): string[] {
  return allIds.filter((id) => id !== currentId);
}
