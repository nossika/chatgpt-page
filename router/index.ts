import { Middleware } from 'koa';
import Router from '@koa/router';
import { getApiLimiter } from '@/util/limiter';
import { drawImageRoute } from './image';
import { messageRoute, messageStreamRoute, messageStreamSaltRoute } from './message';
import { wechatMessageRoute } from './wechat';
import { translateRoute } from './translate';
import { fileUploadRoute } from './file';

const router = new Router();

enum Route {
  Message = '/message',
  MessageStream = '/message-stream',
  MessageStreamSalt = '/message-stream-salt',
  DrawImage = '/draw-image',
  WechatMessage = '/wechat-message',
  Translate = '/translate',
  FileUpload = '/file/upload',
}

router.get(Route.MessageStreamSalt, messageStreamSaltRoute);
router.post(Route.Message, getApiLimiter(Route.Message), messageRoute);
router.post(Route.MessageStream, getApiLimiter(Route.MessageStream), messageStreamRoute);
router.post(Route.DrawImage, getApiLimiter(Route.DrawImage, 3), drawImageRoute);
router.post(Route.WechatMessage, getApiLimiter(Route.WechatMessage), wechatMessageRoute as Middleware);
router.post(Route.Translate, getApiLimiter(Route.Translate), translateRoute);
router.post(Route.FileUpload, getApiLimiter(Route.FileUpload, 5), fileUploadRoute);

export default router;
