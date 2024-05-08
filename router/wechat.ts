// 给微信开放平台用的接口，有特定数据结构
// @see https://developers.weixin.qq.com/doc/aispeech/platform/3rdparty_api.html

import chatGPT from '@/core/chatgpt';
import { DefaultContext, DefaultState, Middleware } from 'koa';

interface WechatRes {
  answer_type: 'text';
  text_info: {
    short_answer: string;
  };
}

interface WechatMessageReq {
  question?: string;
}

export const wechatMessageRoute: Middleware<DefaultState, DefaultContext, WechatRes> = async (ctx) => {
  ctx.logger(`wechatMessageRoute: ${JSON.stringify(ctx.request.body)} ${JSON.stringify(ctx.request.query)}`);

  const question = (ctx.request.body as WechatMessageReq)?.question;

  if (!question) {
    ctx.body = {
      answer_type: 'text',
      text_info: {
        short_answer: '400',
      },
    };
    return;
  }

  ctx.logger(`question ${question}`);

  const answer = await chatGPT.get()
    .sendMessage(question)
    .catch(err => {
      ctx.body = {
        answer_type: 'text',
        text_info: {
          short_answer: '500',
        },
      };
      ctx.logger(`Error=[wechatMessageRoute] ${String(err)}, ExtraLog=${question}`, 'error');
    });

  if (!answer) return;

  ctx.body = {
    answer_type: 'text',
    text_info: {
      short_answer: answer,
    },
  };
};
