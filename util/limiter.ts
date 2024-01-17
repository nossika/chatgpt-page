import { RateLimit } from 'koa2-ratelimit';
import { Code, response } from '@/util/response';
import config from '@/config';

RateLimit.defaultOptions({
  handler: async (ctx) => {
    ctx.status = 429;
    ctx.body = response('Too many requests, retry later.', Code.ClientError);
  },
  onLimitReached: async function (ctx) {
    ctx.logger(`access limited`, 'error');
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
