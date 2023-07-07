
import path from 'path';
import Koa from 'koa';
import serve from 'koa-static';
import bodyParser from 'koa-bodyparser';
import etag from 'koa-etag';
import conditional from 'koa-conditional-get';
import chatGPT from '@/core/chatgpt';
import { Code } from '@/util/response';
import { useAccessLogger } from '@/util/logger';
import { accessLimiter } from '@/util/limiter';
import { handleCtxErr } from '@/util/error';
import router from '@/router';
import config from '@/config';
import secret from '@/secret.json';

chatGPT.init({
  key: secret.key,
});

const app = new Koa();

// serve static files
app.use(conditional());
app.use(etag());
app.use(serve(path.resolve(__dirname, 'public')));

// set real request ip
app.use(async (ctx, next) => {
  if (config.ipHeader) {
    ctx.request.ip = ctx.request.header[config.ipHeader] as string || ctx.request.ip;
  }
  
  return await next();
});

// access limiter (cannot use more than one limiter for app)
app.use(accessLimiter);

// logger
app.use(useAccessLogger());

// handle uncaught error
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    handleCtxErr({
      ctx,
      err,
    });
  }
});

// parse request body
app.use(bodyParser());

// router
app.use(router.routes());

// fallback to 404
app.use(async (ctx) => {
  handleCtxErr({
    ctx,
    err: new Error('404'),
    code: Code.NotFound,
  });
});

// start server
app.listen(config.port, () => {
  console.log(`listen on port http://localhost:${config.port} with config: ${JSON.stringify(config)}`);
});
