import { Middleware } from 'koa';
import { Code, response } from '@/util/response';
import { handleCtxErr } from '@/util/error';
import chatGPT from '@/core/chatgpt';

interface MessageParams {
  text: string;
  lang?: string;
  targetLangs?: string[];
}

const extractParams = (params: unknown): MessageParams | null => {
  const { text, lang = 'zh', targetLangs = ['en'] }: Partial<MessageParams> = params;

  if (!text || !lang || !Array.isArray(targetLangs)) {
    return null;
  }

  return { text, lang, targetLangs };
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

  const { text, lang, targetLangs } = params;
  ctx.logger(`text: ${text}, lang: ${lang}, targetLangs: ${targetLangs}`);

  const answer = await chatGPT.get().translate(text, lang, targetLangs)
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
