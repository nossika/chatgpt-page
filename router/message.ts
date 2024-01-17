import { ChatCompletionRequestMessageRoleEnum } from 'openai';
import { Middleware } from 'koa';
import { PassThrough } from 'stream';
import { Code, response } from '@/util/response';
import { handleCtxErr } from '@/util/error';
import chatGPT from '@/core/chatgpt';

interface MessageParams {
  message: string;
  context: { type: 'Q' | 'A', content: string }[];
}

const extractParams = (params: unknown): MessageParams | null => {
  const { message, context }: Partial<MessageParams> = params;

  if (!message || !Array.isArray(context) || context.some(c => !c.content || !['Q', 'A'].includes(c.type))) {
    return null;
  }

  return { message, context };
}

export const messageRoute: Middleware = async (ctx) => {
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

  const { message, context } = params;
  ctx.logger(`message: ${message}`);

  const answer = await chatGPT.get().sendMessage(message, context.map(c => ({
    role: {
      Q: ChatCompletionRequestMessageRoleEnum.User,
      A: ChatCompletionRequestMessageRoleEnum.Assistant,
    }[c.type],
    content: c.content,
  })))
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

export const messageStreamRoute: Middleware = async (ctx) => {
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

  const { message, context } = params;
  ctx.logger(`message: ${message}`);

  const receiver = await chatGPT.get().getMessageStream(message, context.map(c => ({
    role: {
      Q: ChatCompletionRequestMessageRoleEnum.User,
      A: ChatCompletionRequestMessageRoleEnum.Assistant,
    }[c.type],
    content: c.content,
  })))
    .catch((err) => {
      handleCtxErr({
        ctx,
        err,
        name: 'openai sdk',
        code: Code.ServerError,
      });
    });

  if (!receiver) return;

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
