import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

const isTest = process.env.NODE_ENV === "test";
const noop: RequestHandler = (_req, _res, next) => next();

export const standardLimiter: RequestHandler = isTest
  ? noop
  : rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, slow down." },
    });

export const authLimiter: RequestHandler = isTest
  ? noop
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many auth attempts, try again later." },
    });

export const txLimiter: RequestHandler = isTest
  ? noop
  : rateLimit({
      windowMs: 60 * 1000,
      max: 600,
      standardHeaders: true,
      legacyHeaders: false,
    });
