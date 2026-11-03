import session from 'express-session';
import RedisStore from 'connect-redis';
import redis from './redis';
import { env } from './env';

export const sessionMiddleware = session({
  name: 'reachinbox.sid',
  store: new RedisStore({ client: redis, prefix: 'reachinbox:sess:' }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
});
