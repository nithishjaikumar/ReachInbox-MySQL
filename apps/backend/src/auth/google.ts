import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env, isGoogleOAuthConfigured } from '../config/env';
import prisma from '../config/database';

if (isGoogleOAuthConfigured) {
  passport.use(new GoogleStrategy({
    clientID: env.GOOGLE_CLIENT_ID!,
    clientSecret: env.GOOGLE_CLIENT_SECRET!,
    callbackURL: env.GOOGLE_CALLBACK_URL!,
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase();
      if (!email) return done(new Error('Google account did not provide an email address'));

      const name = profile.displayName || email;
      const avatarUrl = profile.photos?.[0]?.value || null;

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: profile.id },
            { email },
          ],
        },
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name, avatarUrl, googleId: profile.id, email },
        });
      } else {
        user = await prisma.user.create({
          data: { email, name, avatarUrl, googleId: profile.id },
        });
      }
      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }));
}

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user || false);
  } catch (error) {
    done(error as Error);
  }
});
