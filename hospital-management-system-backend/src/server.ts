import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logError, logger } from './utils/logger';

async function main(): Promise<void> {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Hospital Management API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received, shutting down gracefully`);

    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logError('Failed to start server', err);
  process.exit(1);
});
