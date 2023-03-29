import { Middleware } from 'koa';
import { logger } from '@/util/logger';
import { Code, response } from '@/util/response';
import chatGPT from '@/core/chatgpt';

interface ImageParams {
  description: string;
}

const extraParams = (params: unknown): ImageParams | null => {
  const { description }: Partial<ImageParams> = params;

  if (!description) {
    return null;
  }

  return { description };
}

export const drawImageRoute: Middleware = async (ctx) => {
  const params = extraParams(ctx.request.body);

  if (!params) {
    ctx.status = 403;
    ctx.body = response('invalid params', Code.clientError);
    return;
  }

  const { description } = params;
  logger(`description: ${description}`, ctx);

  let error;
  const url = await chatGPT.get().drawImage(description).catch(err => {
    error = err;
  });

  if (error) {
    const errStr = error.toString();
    logger(`error: ${errStr}, params: ${JSON.stringify(params)}`, ctx, 'error');

    ctx.status = 500;
    ctx.body = response(errStr, Code.serverError);
    return;
  }

  ctx.body = response(url);
};
