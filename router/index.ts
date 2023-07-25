import { Middleware } from 'koa';
import Router from '@koa/router';
import { getApiLimiter } from '@/util/limiter';
import { drawImageRoute } from './image';
import { messageRoute, messageStreamRoute } from './message';
import { wechatMessageRoute } from './wechat';

const router = new Router();

enum Route {
  Message = '/message',
  MessageStream = '/message-stream',
  DrawImage = '/draw-image',
  WechatMessage = '/wechat-message',
}

router.post(Route.Message, getApiLimiter(Route.Message), messageRoute);
router.post(Route.MessageStream, getApiLimiter(Route.MessageStream), messageStreamRoute);
router.post(Route.DrawImage, getApiLimiter(Route.DrawImage), drawImageRoute);
router.post(Route.WechatMessage, getApiLimiter(Route.WechatMessage), wechatMessageRoute as Middleware);

export default router;
