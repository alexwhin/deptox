import { describe, it, expect } from "vitest";
import { createLogger, LoggerName, Logger } from "./logger";

describe("createLogger", () => {
  describe("logger creation", () => {
    it("creates a logger with the given name", () => {
      const logger = createLogger(LoggerName.APP);

      expect(logger).toHaveProperty("log");
      expect(logger).toHaveProperty("warn");
      expect(logger).toHaveProperty("error");
      expect(logger).toHaveProperty("debug");
      expect(logger).toHaveProperty("info");
    });

    it("returns a Logger interface", () => {
      const logger: Logger = createLogger(LoggerName.STORE);

      expect(typeof logger.log).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
    });
  });

  describe("logger interface", () => {
    it("log method exists and is callable", () => {
      const logger = createLogger(LoggerName.APP);

      expect(typeof logger.log).toBe("function");
      expect(() => logger.log("test")).not.toThrow();
    });

    it("warn method exists and is callable", () => {
      const logger = createLogger(LoggerName.APP);

      expect(typeof logger.warn).toBe("function");
      expect(() => logger.warn("test")).not.toThrow();
    });

    it("error method exists and is callable", () => {
      const logger = createLogger(LoggerName.APP);

      expect(typeof logger.error).toBe("function");
      expect(() => logger.error("test")).not.toThrow();
    });

    it("debug method exists and is callable", () => {
      const logger = createLogger(LoggerName.APP);

      expect(typeof logger.debug).toBe("function");
      expect(() => logger.debug("test")).not.toThrow();
    });

    it("info method exists and is callable", () => {
      const logger = createLogger(LoggerName.APP);

      expect(typeof logger.info).toBe("function");
      expect(() => logger.info("test")).not.toThrow();
    });

    it("all methods accept variable arguments", () => {
      const logger = createLogger(LoggerName.APP);

      expect(() => logger.log("msg", 1, 2, 3)).not.toThrow();
      expect(() => logger.warn("msg", { key: "value" })).not.toThrow();
      expect(() => logger.error("msg", null, undefined)).not.toThrow();
      expect(() => logger.debug("msg", [1, 2, 3])).not.toThrow();
      expect(() => logger.info("msg", "extra", "args")).not.toThrow();
    });
  });

  describe("LoggerName enum", () => {
    it("has correct enum values matching uppercase pattern", () => {
      expect(LoggerName.APP).toBe("APP");
      expect(LoggerName.STORE).toBe("STORE");
      expect(LoggerName.EVENTS).toBe("EVENTS");
      expect(LoggerName.COMPONENT).toBe("COMPONENT");
      expect(LoggerName.UPDATE_CHECKER).toBe("UPDATE_CHECKER");
    });

    it("enum values are strings", () => {
      expect(typeof LoggerName.APP).toBe("string");
      expect(typeof LoggerName.STORE).toBe("string");
      expect(typeof LoggerName.EVENTS).toBe("string");
      expect(typeof LoggerName.COMPONENT).toBe("string");
      expect(typeof LoggerName.UPDATE_CHECKER).toBe("string");
    });

    it("each logger name creates a separate logger instance", () => {
      const appLogger = createLogger(LoggerName.APP);
      const storeLogger = createLogger(LoggerName.STORE);

      expect(appLogger).not.toBe(storeLogger);
    });
  });
});
