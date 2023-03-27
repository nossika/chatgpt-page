
import path from 'path';
import Koa from 'koa';
import serve from 'koa-static';
import bodyParser from 'koa-bodyparser';
import argv from '@/util/argv';
import ChatGPT from '@/core/chatgpt';
import { Code, response } from '@/util/response';
import { useAccessLogger } from '@/util/logger';
import { messageRoute, messageStreamRoute } from '@/router/message';
import secret from '@/secret.json';

export const chatGPT = new ChatGPT({
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

// path route
app.use(messageRoute);
app.use(messageStreamRoute);

// 404
app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = response('404', Code.clientError);
});

const port = argv.port || 8000;

app.listen(port, () => {
  console.log(`listen on port http://localhost:${port}, argv: ${JSON.stringify(argv)}`);
});
