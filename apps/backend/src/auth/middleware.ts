import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  next(new AppError('Unauthorized', 401));
};
