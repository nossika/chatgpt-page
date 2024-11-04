import fs from 'node:fs';
import path from 'node:path';
import mime from 'mime';
import { Middleware } from 'koa';
import { Code, response } from '@/util/response';
import { handleCtxErr } from '@/util/error';
import config from '@/config';

export const fileUploadRoute: Middleware = async (ctx) => {
  let file = ctx.request.files?.file;

  if (file instanceof Array) {
    file = file[0];
  }

  if (!file) {
    handleCtxErr({
      ctx,
      err: new Error('invalid params'),
      name: 'params check',
      code: Code.Forbidden,
    });
    return;
  }

  const filePath = path.resolve(config.tmpFilePath, `${file.newFilename}.${mime.getExtension(file.mimetype)}`);

  // 将临时文件转移至 public 目录，使其可被外部访问
  fs.renameSync(file.filepath, path.resolve(config.tmpFilePath, filePath));

  const publicPath = `/${path.relative(path.resolve(__dirname, '..', 'public'), filePath)}`;
  
  ctx.body = response(publicPath);
};
