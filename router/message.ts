import { Middleware } from 'koa';
import { PassThrough } from 'stream';
import { Code, response } from '@/util/response';
import { handleCtxErr } from '@/util/error';
import chatGPT from '@/core/chatgpt';
import type { ChatCompletionMessageParam } from 'openai/resources';

const saltMessage = '>.........................................................<';

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

const contextConvert = (context: MessageParams['context']): ChatCompletionMessageParam[] => {
  return context.map(c => {
    switch (c.type) {
      case 'Q':
        return {
          role: 'user',
          content: c.content,
        };
      case 'A':
        return {
          role: 'assistant',
          content: c.content,
        };
    }
  });
};

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

  const answer = await chatGPT.get().sendMessage(message, contextConvert(context))
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

  const stream = await chatGPT.get().getMessageStream(message, contextConvert(context))
    .catch((err) => {
      handleCtxErr({
        ctx,
        err,
        name: 'openai sdk',
        code: Code.ServerError,
      });
    });

  if (!stream) return;

  const passThrough = new PassThrough();

  ctx.set({
    'Content-Type': 'text/event-stream',
  });

  ctx.body = passThrough;

  // @note: 另起线程处理流式数据，避免阻塞当下的接口返回
  (async () => {
    for await (const chunk of stream) {
      passThrough.write(saltMessage);
      passThrough.write(chunk.choices[0]?.delta?.content || '');
    }
  })().finally(() => {
    passThrough.end();
  });
};
