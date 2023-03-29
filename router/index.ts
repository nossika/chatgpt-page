import Router from '@koa/router';
import { drawImageRoute } from './image';
import { messageRoute, messageStreamRoute } from './message';

const router = new Router();

router.post('/message', messageRoute);
router.post('/message-stream', messageStreamRoute);
router.post('/draw-image', drawImageRoute);

export default router;
