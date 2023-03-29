
import path from 'path';
import Koa from 'koa';
import serve from 'koa-static';
import bodyParser from 'koa-bodyparser';
import chatGPT from '@/core/chatgpt';
import argv from '@/util/argv';
import { Code, response } from '@/util/response';
import { useAccessLogger } from '@/util/logger';
import router from '@/router';
import secret from '@/secret.json';

chatGPT.init({
  key: secret.key,
  org: secret.org,
});

const app = new Koa();

// serve static files
app.use(serve(path.resolve(__dirname, 'public')));

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

const port = argv.port || 8000;

app.listen(port, () => {
  console.log(`listen on port http://localhost:${port}, argv: ${JSON.stringify(argv)}`);
});
