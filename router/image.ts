import { Middleware } from 'koa';
import { Code, response } from '@/util/response';
import { handleCtxErr } from '@/util/error';
import chatGPT from '@/core/chatgpt';

interface ImageParams {
  description: string;
}

const extractParams = (params: unknown): ImageParams | null => {
  const { description }: Partial<ImageParams> = params;

  if (!description) {
    return null;
  }

  return { description };
}

export const drawImageRoute: Middleware = async (ctx) => {
  const params = extractParams(ctx.request.body);

  if (!params) {
    handleCtxErr({
      ctx,
      err: new Error('invalid params'),
      name: 'invalid params',
      code: Code.Forbidden,
    });
    return;
  }

  const { description } = params;
  ctx.logger(`description: ${description}`);

  const url = await chatGPT.get().drawImage(description)
    .catch(err => {
      handleCtxErr({
        ctx,
        err,
        name: 'openai sdk',
        code: Code.ServerError,
      });
    });

  if (!url) return;

  ctx.body = response(url);
};
