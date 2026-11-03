import { Request, Response, NextFunction } from 'express';
import { z, AnyZodObject } from 'zod';

export const validate = (schema: AnyZodObject) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = await schema.parseAsync({ body: req.body, query: req.query, params: req.params });
    if (parsed.body) req.body = parsed.body;
    return next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: (error as z.ZodError).flatten() });
    }
    return next(error);
  }
};
