type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL: LogLevel = 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}

export const logger = {
  debug(module: string, ...args: unknown[]) {
    if (shouldLog('debug')) {
      console.log(`[${module}]`, ...args);
    }
  },

  info(module: string, ...args: unknown[]) {
    if (shouldLog('info')) {
      console.log(`[${module}]`, ...args);
    }
  },

  warn(module: string, ...args: unknown[]) {
    if (shouldLog('warn')) {
      console.warn(`[${module}]`, ...args);
    }
  },

  error(module: string, ...args: unknown[]) {
    if (shouldLog('error')) {
      console.error(`[${module}]`, ...args);
    }
  },
};
