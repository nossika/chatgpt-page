import Router from '@koa/router';
import { getApiLimiter } from '@/util/limiter';
import { drawImageRoute } from './image';
import { messageRoute, messageStreamRoute } from './message';

const router = new Router();

enum Route {
  Message = '/message',
  MessageStream = '/message-stream',
  DrawImage = '/draw-image',
}

router.post(Route.Message, getApiLimiter(Route.Message), messageRoute);
router.post(Route.MessageStream, getApiLimiter(Route.MessageStream), messageStreamRoute);
router.post(Route.DrawImage, getApiLimiter(Route.DrawImage), drawImageRoute);

export default router;
