import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const format = isProduction
  ? winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    )
  : winston.format.combine(
      winston.format.colorize(),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ level, message, stack }) => `${level}: ${stack ?? message}`),
    );

/**
 * Application logger. JSON lines in production (what log aggregators expect),
 * readable colourised output in development, silent under test.
 */
export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  silent: isTest,
  format,
  transports: [new winston.transports.Console()],
});

/** Logs an unexpected error together with its stack trace and a short context message. */
export function logError(context: string, error: unknown): void {
  logger.error(
    error instanceof Error
      ? `${context}: ${error.stack ?? error.message}`
      : `${context}: ${String(error)}`,
  );
}
