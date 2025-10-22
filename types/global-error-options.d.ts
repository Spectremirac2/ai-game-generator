export {};

declare global {
  interface ErrorOptions {
    cause?: unknown;
  }

  interface ErrorConstructor {
    new (message?: string, options?: ErrorOptions): Error;
    (message?: string, options?: ErrorOptions): Error;
  }
}
