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

export const getApiLimiter = (prefixKey: string) => {
  return RateLimit.middleware({
    interval: {
      min: 1,
    },
    max: config.apiAccessLimitPerMin,
    prefixKey,
  });
};

export const accessLimiter = RateLimit.middleware({
  interval: {
    day: 1,
  },
  max: config.accessLimitPerDay,
});
