/**
 * Error definitions for background removal operations.
 */

export class BackgroundRemovalError extends Error {
  readonly statusCode: number;
  readonly isCancelled: boolean;

  constructor(message: string, statusCode: number = 0, isCancelled: boolean = false) {
    super(message);
    this.name = 'BackgroundRemovalError';
    this.statusCode = statusCode;
    this.isCancelled = isCancelled;
  }
}

export class RemoteConsentRequiredError extends BackgroundRemovalError {
  constructor() {
    super(
      'Cloud AI background removal requires explicit user consent before transmitting photos.',
      403,
      false
    );
    this.name = 'RemoteConsentRequiredError';
  }
}

export class RemoteNotConfiguredError extends BackgroundRemovalError {
  constructor() {
    super(
      'Remote background removal service endpoint is not configured.',
      503,
      false
    );
    this.name = 'RemoteNotConfiguredError';
  }
}
