import { config } from '../config/env';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
  }

  public info(message: string, ...meta: unknown[]): void {
    console.log(this.formatMessage('info', message), ...meta);
  }

  public warn(message: string, ...meta: unknown[]): void {
    console.warn(this.formatMessage('warn', message), ...meta);
  }

  public error(message: string, error?: unknown, ...meta: unknown[]): void {
    console.error(this.formatMessage('error', message), ...meta);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    } else if (error) {
      console.error(error);
    }
  }

  public debug(message: string, ...meta: unknown[]): void {
    if (config.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message), ...meta);
    }
  }
}

export const logger = new Logger();
export default logger;
