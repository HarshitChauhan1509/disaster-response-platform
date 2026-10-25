import pino from 'pino';
import { config } from '../../config/index.js';

// In production or non-interactive environments (Docker, cloud runners), use structured JSON logging.
// Only use pino-pretty for local interactive development terminals.
const usePretty = config.NODE_ENV === 'development' && Boolean(process.stdout.isTTY);

export const logger = pino({
  level: config.LOG_LEVEL,
  transport: usePretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
