import { ChatCompletionRequestMessageRoleEnum } from "openai";
import { logger } from '@/util/logger';
import { APIResponse, Code, response } from '@/util/response';
import { chatGPT } from '..';

const route = '/message';

const messageRoute = async (ctx, next) => {
  if (ctx.url !== route) {
    return await next();
  }

  const { message, context }: { 
    message?: string;
    context?: { type: 'Q' | 'A', content: string }[];
  } = ctx.request.body;

  if (!message || !Array.isArray(context) || context.some(c => !c.content || !['Q', 'A'].includes(c.type))) {
    ctx.body = response('invalid params', Code.clientError);
    return;
  }

  logger(`message: ${message}`, ctx);

  let res: APIResponse<string>;
  try {
    const answer = await chatGPT.sendMessage(message, context.map(c => ({
      role: {
        Q: ChatCompletionRequestMessageRoleEnum.User,
        A: ChatCompletionRequestMessageRoleEnum.Assistant,
      }[c.type],
      content: c.content,
    })));
    res = response(answer)
  } catch (err) {
    const errStr = err.toString();
    res = response(errStr, Code.serverError);

    const log = `error: ${errStr}, message: ${message}`;
    logger(log, ctx, 'error');
  }

  ctx.body = res;
}

export default messageRoute;
