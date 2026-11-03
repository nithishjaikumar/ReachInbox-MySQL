
import { Router } from 'express';
import passport from 'passport';
import { requireAuth } from '../auth/middleware';
import { env, isGoogleOAuthConfigured } from '../config/env';

export const authRouter = Router();

const googleUnavailable = (_req: any, res: any, next: any) => {
  if (!isGoogleOAuthConfigured) {
    return res.status(503).json({
      success: false,
      error: 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL.',
    });
  }
  next();
};

authRouter.get(
  '/google',
  googleUnavailable,
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

authRouter.get(
  '/google/callback',
  googleUnavailable,
  passport.authenticate('google', {
    failureRedirect: `${env.FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => res.redirect(`${env.FRONTEND_URL}/dashboard`)
);

authRouter.post('/logout', requireAuth, (req, res, next) => {
  req.logout((logoutError) => {
    if (logoutError) return next(logoutError);

    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);

      res.clearCookie('reachinbox.sid', {
        httpOnly: true,
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: env.NODE_ENV === 'production',
      });

      res.json({ success: true });
    });
  });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
