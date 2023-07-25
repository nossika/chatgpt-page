// 给微信开放平台用的接口，有特定数据结构
// @see https://developers.weixin.qq.com/doc/aispeech/platform/3rdparty_api.html

import chatGPT from '@/core/chatgpt';
import { logger } from '@/util/logger';
import { DefaultContext, DefaultState, Middleware } from 'koa';

interface WechatRes<T = {}> {
  err_code: number;
  data_list?: T[];
}

interface WechatMessageReq {
  question?: string;
}

type WechatMessageRes = WechatRes<{ answer: string }>;

export const wechatMessageRoute: Middleware<DefaultState, DefaultContext, WechatMessageRes> = async (ctx) => {
  const question = (ctx.request.body as WechatMessageReq)?.question;
  if (!question) {
    ctx.body = {
      err_code: 400,
    };
    return;
  }

  const answer = await chatGPT.get()
    .sendMessage(question)
    .catch(err => {
      ctx.body = {
        err_code: 500,
      };
      logger(`Error=[wechatMessageRoute] ${String(err)}, ExtraLog=${question}`, ctx, 'error');
    });

  if (!answer) return;

  ctx.body = {
    err_code: 0,
    data_list: [
      {
        answer,
      },
    ],
  };
};

