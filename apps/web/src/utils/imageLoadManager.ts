/**
 * Image Load Session & Concurrency Manager.
 *
 * Prevents race conditions where a slower, previously initiated image decode
 * completes after a newer file selection and overwrites the active photo in state.
 */

export interface ImageLoadSession {
  /**
   * Increments and returns the next session token.
   */
  nextSessionId(): number;

  /**
   * Checks whether the provided token matches the active session.
   */
  isActive(sessionId: number): boolean;

  /**
   * Cancels the active session so in-flight callbacks are discarded.
   */
  cancel(): void;

  /**
   * Returns the current active session ID.
   */
  getCurrentId(): number;
}

export function createImageLoadSession(): ImageLoadSession {
  let currentSessionId = 0;

  return {
    nextSessionId(): number {
      currentSessionId += 1;
      return currentSessionId;
    },
    isActive(sessionId: number): boolean {
      return sessionId === currentSessionId && currentSessionId !== 0;
    },
    cancel(): void {
      currentSessionId += 1;
    },
    getCurrentId(): number {
      return currentSessionId;
    },
  };
}
