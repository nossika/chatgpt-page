import { Middleware, ParameterizedContext } from 'koa';
import path from 'path';
import log4js from 'log4js';
import config from '@/config';

log4js.configure({
  appenders: {
    file: {
      type: 'dateFile',
      pattern: 'yyyy-MM-dd.log',
      alwaysIncludePattern: true,
      encoding: 'utf-8',
      filename: path.resolve(__dirname, '..', 'logs', 'access'),
      numBackups: 3,
    },
  },
  categories: {
    default: { appenders: ['file'], level: 'info' },
  },
});
  
const originLogger = log4js.getLogger();

export const logger = (message: string, ctx: ParameterizedContext, type: 'info' | 'error' = 'info') => {
  const prefix = `${ctx.request.ip} ${ctx.request.header[config.idHeader]} ${ctx.method} ${ctx.url} `;
  const log = prefix + message;

  if (type === 'error') {
    originLogger.error(log);
    return;
  }

  originLogger.info(log);
}

export const useAccessLogger = (): Middleware => {
  return async (ctx, next) => {
    const time = Date.now();
    let err;
    await next().catch(nextErr => {
      err = nextErr;
    });

    logger(`➡️ ${ctx.status} ${Date.now() - time}ms`, ctx);

    if (err) {
      throw err;
    }
  };
};
