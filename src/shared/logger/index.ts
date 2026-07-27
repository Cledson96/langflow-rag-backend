import pino from 'pino';

export function createLogger() {
  return pino({
    redact: {
      censor: '[REDACTED]',
      paths: ['req.headers.authorization', 'password', 'token', '*.apiKey', '*.secret'],
    },
  });
}
