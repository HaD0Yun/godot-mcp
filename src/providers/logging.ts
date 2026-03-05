export type ProviderLogLevel = 'info' | 'warn' | 'error';

export function formatProviderError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function providerLog(
  level: ProviderLogLevel,
  provider: string,
  message: string,
  error?: unknown,
): void {
  const errorSuffix = error === undefined ? '' : ` | error=${formatProviderError(error)}`;
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [providers:${provider}] [${level.toUpperCase()}] ${message}${errorSuffix}`);
}
