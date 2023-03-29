import { RateLimit } from 'koa2-ratelimit';
import { Code, response } from '@/util/response';
import { logger } from '@/util/logger';
import config from '@/config';

RateLimit.defaultOptions({
  handler: async (ctx) => {
    ctx.status = 429;
    ctx.body = response('Too many requests, retry later.', Code.clientError);
  },
  onLimitReached: async function (ctx) {
    logger(`access limited`, ctx, 'error');
  },
});

export const minLimiter = RateLimit.middleware({
  interval: {
    min: 1,
  },
  max: config.ipAccessLimitPerMin,
});

export const dayLimiter = RateLimit.middleware({
  interval: {
    day: 1,
  },
  max: config.ipAccessLimitPerDay,
});
