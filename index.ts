
import path from 'path';
import Koa from 'koa';
import serve from 'koa-static';
import bodyParser from 'koa-bodyparser';
import chatGPT from '@/core/chatgpt';
import { Code, response } from '@/util/response';
import { useAccessLogger } from '@/util/logger';
import { minLimiter, dayLimiter } from '@/util/limiter';
import router from '@/router';
import config from '@/config';
import secret from '@/secret.json';

chatGPT.init({
  key: secret.key,
  org: secret.org,
});

const app = new Koa();

// serve static files
app.use(serve(path.resolve(__dirname, 'public')));

// set real request ip
app.use(async (ctx, next) => {
  if (config.ipHeader) {
    ctx.request.ip = ctx.request.header[config.ipHeader] as string || ctx.request.ip;
  }
  
  return await next();
});

// access limiter
app.use(dayLimiter);
app.use(minLimiter);

// parse request body
app.use(bodyParser());

// logger
app.use(useAccessLogger());

// router
app.use(router.routes());

// 404
app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = response('404', Code.clientError);
});

app.listen(config.port, () => {
  console.log(`listen on port http://localhost:${config.port} with config: ${JSON.stringify(config)}`);
});
