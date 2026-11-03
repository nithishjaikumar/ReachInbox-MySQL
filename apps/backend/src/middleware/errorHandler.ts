import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface ErrorWithCode extends Error {
  code?: string;
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error('Unhandled error', err);

  // Handle Prisma-style errors
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const errorWithCode = err as ErrorWithCode;

    if (errorWithCode.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'A record with this value already exists.',
      });
      return;
    }
  }

  // Application errors carry an intentional HTTP status.
  if (typeof err === 'object' && err !== null && 'statusCode' in err) {
    const appError = err as Error & { statusCode: number };
    res.status(appError.statusCode).json({ success: false, error: appError.message });
    return;
  }

  // Handle normal JavaScript errors
  if (err instanceof Error) {
    res.status(500).json({
      success: false,
      error:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};