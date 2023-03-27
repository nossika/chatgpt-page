import { ChatCompletionRequestMessageRoleEnum } from 'openai';
import { Middleware } from 'koa';
import { PassThrough } from 'stream';
import { logger } from '@/util/logger';
import { Code, response } from '@/util/response';
import { Receiver } from '@/core/chatgpt';
import { chatGPT } from '..';

const route = '/message';
const streamRoute = '/message-stream';

interface MessageParams {
  message: string;
  context: { type: 'Q' | 'A', content: string }[];
}

const extraParams = (params: unknown): MessageParams | null => {
  const { message, context }: Partial<MessageParams> = params;

  if (!message || !Array.isArray(context) || context.some(c => !c.content || !['Q', 'A'].includes(c.type))) {
    return null;
  }

  return { message, context };
}

export const messageRoute: Middleware = async (ctx, next) => {
  if (ctx.url !== route) {
    return await next();
  }

  const params = extraParams(ctx.request.body);

  if (!params) {
    ctx.status = 403;
    ctx.body = response('invalid params', Code.clientError);
    return;
  }

  const { message, context } = params;
  logger(`message: ${message}`, ctx);

  let error;
  const answer = await chatGPT.sendMessage(message, context.map(c => ({
    role: {
      Q: ChatCompletionRequestMessageRoleEnum.User,
      A: ChatCompletionRequestMessageRoleEnum.Assistant,
    }[c.type],
    content: c.content,
  }))).catch(err => {
    error = err;
  });

  if (error) {
    const errStr = error.toString();
    logger(`error: ${errStr}, params: ${JSON.stringify(params)}`, ctx, 'error');

    ctx.status = 500;
    ctx.body = response(errStr, Code.serverError);
    return;
  }

  ctx.body = response(answer)
};

export const messageStreamRoute: Middleware = async (ctx, next) => {
  if (ctx.url !== streamRoute) {
    return await next();
  }

  const params = extraParams(ctx.request.body);

  if (!params) {
    ctx.status = 403;
    ctx.body = response('invalid params', Code.clientError);
    return;
  }

  const { message, context } = params;
  logger(`message: ${message}`, ctx);

  let error;
  const receiver = await chatGPT.getMessageStream(message, context.map(c => ({
    role: {
      Q: ChatCompletionRequestMessageRoleEnum.User,
      A: ChatCompletionRequestMessageRoleEnum.Assistant,
    }[c.type],
    content: c.content,
  }))).catch((err) => {
    error = err;
  }) as Receiver;

  if (error) {
    const errStr = error.toString();
    logger(`error: ${errStr}, params: ${JSON.stringify(params)}`, ctx, 'error');

    ctx.status = 500;
    ctx.body = response(errStr, Code.serverError);
    return;
  }

  const stream = new PassThrough();

  receiver.on('data', (data) => {
    stream.write(data);
  });

  receiver.on('end', () => {
    stream.end();
  });

  ctx.set({
    'Content-Type': 'text/event-stream',
  });

  ctx.body = stream;
};