import { Middleware } from 'koa';
import { Code, response } from '@/util/response';
import { handleCtxErr } from '@/util/error';
import chatGPT from '@/core/chatgpt';

interface MessageParams {
  text: string;
  originalLang?: string;
  targetLangs?: string[];
}

const extractParams = (params: unknown): MessageParams | null => {
  const { text, originalLang = '', targetLangs = ['en'] }: Partial<MessageParams> = params;

  if (!text || !Array.isArray(targetLangs)) {
    return null;
  }

  return { text, originalLang, targetLangs };
}

export const translateRoute: Middleware = async (ctx) => {
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

  const { text, originalLang, targetLangs } = params;
  ctx.logger(`text: ${text}, targetLangs: ${targetLangs}, originalLang: ${originalLang}`);

  const answer = await chatGPT.get().translate(text, targetLangs, originalLang)
    .catch(err => {
      handleCtxErr({
        ctx,
        err,
        name: 'openai sdk',
        code: Code.ServerError,
      });
    });

  if (!answer) return;

  ctx.body = response(answer);
};
