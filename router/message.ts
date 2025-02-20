import { Middleware } from 'koa';
import { PassThrough } from 'stream';
import { Code, response } from '@/util/response';
import { handleCtxErr } from '@/util/error';
import chatGPT from '@/core/chatgpt';
import type { ChatCompletionAssistantMessageParam, ChatCompletionUserMessageParam } from 'openai/resources';

interface MessageParams {
  message: string;
  imgURL?: string;
  context: { 
    type: 'Q' | 'A';
    message: string;
    imgURL?: string;
  }[];
}

const extractParams = (params: unknown): MessageParams | null => {
  const { message, imgURL, context }: Partial<MessageParams> = params;

  if (!message || !Array.isArray(context) || context.some(c => !c.message || !['Q', 'A'].includes(c.type))) {
    return null;
  }

  return { message, imgURL, context };
};

const message2Content = (message: string, imgURL?: string): ChatCompletionUserMessageParam['content'] => {
  if (!imgURL) {
    return message;
  }

  return (
    [
      {
        type: 'image_url',
        image_url: {
          url: imgURL,
        },
      },
      {
        type: 'text',
        text: message,
      },
    ]
  );
};

const context2Params = (context: MessageParams['context']) => {
  return context.map(c => {
    switch (c.type) {
      case 'Q': {
        const data: ChatCompletionUserMessageParam = {
          role: 'user',
          content: message2Content(c.message, c.imgURL),
        };
        return data;
      }
      case 'A': {
        const data: ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: c.message,
        };
        return data;
      }
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

  const { message, imgURL, context } = params;
  ctx.logger(`message: ${message}`);

  const answer = await chatGPT.get()
    .sendMessage(message2Content(message, imgURL), context2Params(context))
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

/**
 * 客户端使用数据前需要替换掉 saltMessage
 * 使用"... + 空格"使得客户端断句在任何区间，都有良好的展示体验，省去额外的 UI 处理逻辑
 */
// const saltMessage = '...                                 ';

const saltMessage = '';

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

  const { message, imgURL, context } = params;
  ctx.logger(`message: ${message}`);

  const stream = await chatGPT.get()
    .getMessageStream(message2Content(message, imgURL), context2Params(context))
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
    for await (const message of stream) {
      passThrough.write(message);
      // @note: 人为增加数据长度来强制提早返回数据，否则数据量少且网络波动的情况下，网络层会一直等待凑够足够数据才发送，导致失去流式传输的体验
      passThrough.write(saltMessage);
    }
  })().finally(() => {
    passThrough.end();
  });
};

export const messageStreamSaltRoute: Middleware = async (ctx) => {
  ctx.body = response(saltMessage);
};
