import rateLimit from 'express-rate-limit';

// Обмеження для логіну: 5 спроб на 15 хвилин
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 5, // Обмеження: 5 запитів з одного IP
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Обмеження для реєстрації: 3 спроби на годину
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 година
  max: 3, // Обмеження: 3 запити
  message: { error: 'Too many accounts created from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Обмеження для перевірки коду: 5 спроб на 15 хвилин (захист від перебору 6-значного коду)
export const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 5,
  message: { error: 'Too many verification attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Обмеження на повторне відправлення листа: 3 рази на годину
export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 година
  max: 3,
  message: { error: 'Too many resend requests, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Глобальне обмеження для всіх інших API (наприклад, 100 запитів на 15 хвилин)
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: process.env.NODE_ENV === 'production' ? 100 : 5000, // TODO: потім зменшити
  message: { error: 'Too many requests from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Обмеження для перегляду shared links (захист від brute-force паролів): 15 спроб на 15 хвилин
export const shareLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many attempts to access shared links, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
