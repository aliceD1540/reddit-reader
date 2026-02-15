// Logging utility for Reddit Reader Bot

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any): void {
    console.log(`[${this.context}] INFO: ${message}`, data ? JSON.stringify(data) : '');
  }

  error(message: string, error?: any): void {
    console.error(`[${this.context}] ERROR: ${message}`, error ? JSON.stringify(error) : '');
  }

  warn(message: string, data?: any): void {
    console.warn(`[${this.context}] WARN: ${message}`, data ? JSON.stringify(data) : '');
  }

  debug(message: string, data?: any): void {
    console.debug(`[${this.context}] DEBUG: ${message}`, data ? JSON.stringify(data) : '');
  }
}
