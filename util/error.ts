import { ParameterizedContext } from 'koa';
import { Code, response } from './response';
import { logger } from './logger';

export const handleCtxErr = ({
  ctx,
  err,
  name = 'error',
  extraLog = '',
  code = Code.ServerError,
}: {
  ctx: ParameterizedContext;
  err: any;
  name?: string;
  extraLog?: string;
  code?: Code;
}) => {
  const errStr = `[${name}] ${String(err)}`;
  logger(`Error=${errStr}, ExtraLog=${extraLog}`, ctx, 'error');

  ctx.status = code;
  ctx.body = response(errStr, code);

  return err;
};
