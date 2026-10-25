import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { logger } from './shared/logger/logger.js';

async function bootstrap() {
  try {
    // 1. Connect database
    await connectDatabase();

    // 2. Initialize application
    const app = createApp();

    // 3. Listen on port
    const server = app.listen(config.PORT, () => {
      logger.info(`Emergency Response Coordination API running on http://localhost:${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
    });

    // 4. Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} signal received. Closing HTTP server gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed. Disconnecting from database...');
        await disconnectDatabase();
        logger.info('Graceful shutdown completed. Exiting.');
        process.exit(0);
      });

      // Force close if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ error }, 'Fatal error during server bootstrap');
    process.exit(1);
  }
}

bootstrap();
