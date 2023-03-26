
import path from 'path';
import Koa from 'koa';
import serve from 'koa-static';
import bodyParser from 'koa-bodyparser';
import argv from '@/util/argv';
import ChatGPT from '@/core/chatgpt';
import { APIResponse, Code, response } from '@/util/response';
import { logger, useLogger } from '@/util/logger';
import secret from '@/secret.json';

const app = new Koa();

const chatGPT = new ChatGPT({
  key: secret.key,
  org: secret.org,
});

app.use(serve(path.resolve(__dirname, 'public')));

app.use(bodyParser());

app.use(useLogger());

app.use(async (ctx, next) => {
  if (ctx.url !== '/ask') {
    return await next();
  }

  const { question }: { question?: string } = ctx.request.body;

  if (!question) {
    ctx.body = response('invalid params', Code.clientError);
    return;
  }

  let res: APIResponse<string>;
  try {
    const answer = await chatGPT.ask(question);
    res = response(answer)
  } catch (err) {
    const errStr = err.toString();
    res = response(errStr, Code.serverError);

    const log = `error: ${errStr}, question: ${question}`;
    logger(log, ctx, 'error');
  }

  ctx.body = res;
});

app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = response('404', Code.clientError);
});

const port = argv.port || 8000;

app.listen(port, () => {
  console.log(`listen on port http://localhost:${port}, argv: ${JSON.stringify(argv)}`);
});

