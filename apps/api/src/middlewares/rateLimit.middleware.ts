import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const userLimitStore = new Map<string, RateLimitStore>();
const ipLimitStore = new Map<string, RateLimitStore>();

// Clean up expired keys periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, store] of userLimitStore.entries()) {
    if (now > store.resetTime) userLimitStore.delete(key);
  }
  for (const [key, store] of ipLimitStore.entries()) {
    if (now > store.resetTime) ipLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * User-based rate limiter (Key: req.user.id)
 */
export function userRateLimit(maxRequests: number = 5, windowMs: number = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id || req.ip || 'anonymous';
    const now = Date.now();

    let record = userLimitStore.get(userId);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      userLimitStore.set(userId, record);
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Terlalu banyak permintaan presensi dari akun Anda. Silakan tunggu 1 menit lagi.'
      });
    }

    record.count++;
    next();
  };
}

/**
 * IP-based rate limiter (Loose limit for shared office NAT IP)
 */
export function ipRateLimit(maxRequests: number = 300, windowMs: number = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    let record = ipLimitStore.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      ipLimitStore.set(ip, record);
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Terlalu banyak permintaan dari alamat IP ini. Silakan coba beberapa saat lagi.'
      });
    }

    record.count++;
    next();
  };
}
