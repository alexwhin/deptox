import log from "loglevel";

const originalFactory = log.methodFactory;
log.methodFactory = (methodName, logLevel, loggerName) => {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);
  return (message, ...args) => {
    rawMethod(`[${String(loggerName)}] ${message}`, ...args);
  };
};

/* v8 ignore next */
log.setDefaultLevel(import.meta.env.DEV ? "debug" : "error");

export enum LoggerName {
  APP = "APP",
  STORE = "STORE",
  EVENTS = "EVENTS",
  COMPONENT = "COMPONENT",
  UPDATE_CHECKER = "UPDATE_CHECKER",
}

export interface Logger {
  log: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
}

export function createLogger(name: LoggerName): Logger {
  return log.getLogger(name);
}

export const appLogger = createLogger(LoggerName.APP);
export const storeLogger = createLogger(LoggerName.STORE);
export const eventsLogger = createLogger(LoggerName.EVENTS);
export const componentLogger = createLogger(LoggerName.COMPONENT);
export const updateCheckerLogger = createLogger(LoggerName.UPDATE_CHECKER);
