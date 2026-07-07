import rateLimit from 'express-rate-limit';
import { createClient } from 'redis';
import RedisStore from 'rate-limit-redis';

// Initialize Redis client if REDIS_URL is provided in environment
let redisClient: any = null;
let store: any = undefined;

if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.connect()
    .then(() => {
      console.log('[RateLimiter] Connected to Redis successfully');
    })
    .catch((err: any) => {
      console.error('[RateLimiter] Redis connection error:', err);
    });

  store = new RedisStore({
    // @ts-ignore
    sendCommand: async (...args: string[]) => {
      if (!redisClient || !redisClient.isOpen) {
        throw new Error('Redis client is not connected');
      }
      return redisClient.sendCommand(args);
    },
  });
  console.log('[RateLimiter] Production Rate Limiter: RedisStore initialized');
} else {
  console.log('[RateLimiter] Development Rate Limiter: falling back to MemoryStore');
}

// Helper to generate rate-limiting keys dynamically (API Key -> User ID -> Client IP)
const makeKeyGenerator = (prefix: string) => (req: any): string => {
  if (req.apiKeyId) {
    return `${prefix}:apikey:${req.apiKeyId}`;
  }
  if (req.user?.userId) {
    return `${prefix}:user:${req.user.userId}`;
  }
  return `${prefix}:ip:${req.ip || 'unknown'}`;
};

// 1. Обмеження для логіну: 5 спроб на 15 хвилин
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 5,
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  keyGenerator: makeKeyGenerator('login'),
});

// 2. Обмеження для реєстрації: 3 спроби на годину
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 година
  max: 3,
  message: { error: 'Too many accounts created from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  keyGenerator: makeKeyGenerator('register'),
});

// 3. Обмеження для перевірки коду: 5 спроб на 15 хвилин
export const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 5,
  message: { error: 'Too many verification attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  keyGenerator: makeKeyGenerator('verify-email'),
});

// 4. Обмеження на повторне відправлення листа: 3 рази на годину
export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 година
  max: 3,
  message: { error: 'Too many resend requests, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  keyGenerator: makeKeyGenerator('resend-verify'),
});

// 5. Глобальне обмеження для всіх внутрішніх API дашборду
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: process.env.NODE_ENV === 'production' ? 100 : 5000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  keyGenerator: makeKeyGenerator('global'),
});

// 6. Обмеження для перегляду shared links: 15 спроб на 15 хвилин
export const shareLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 15,
  message: { error: 'Too many attempts to access shared links, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  keyGenerator: makeKeyGenerator('share-link'),
});

// 7. Обмеження для зовнішнього API v1 (API-ключі): 100 запитів на хвилину
export const v1ApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 хвилина
  max: 100,
  message: { error: 'Too many API requests, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  keyGenerator: makeKeyGenerator('v1-api'),
});

// 8. Обмеження для важкої операції стиснення картинок: 15 запитів на хвилину
export const v1CompressLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 хвилина
  max: 15,
  message: { error: 'Too many compression requests, please throttle your uploads' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  keyGenerator: makeKeyGenerator('v1-compress'),
});
