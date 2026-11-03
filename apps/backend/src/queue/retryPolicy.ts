/** Returns true when BullMQ will schedule another attempt after the current failure. */
export function shouldRetryJob(attemptsMade: number, maxAttempts: number): boolean {
  return attemptsMade + 1 < Math.max(1, maxAttempts);
}
