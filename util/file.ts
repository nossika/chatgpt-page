import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger';

export const cleanExpiredFiles = (folder: string, expiredMs: number) => {
  const filenames = fs.readdirSync(folder);
  filenames.forEach(filename => {
    if (filename === 'readme.txt') return;

    const filepath = path.resolve(folder, filename);
    const stats = fs.statSync(filepath);
    if (!stats.isFile()) return;

    const expired = (Date.now() - stats.birthtimeMs) > expiredMs;
    if (!expired) return;
    fs.rmSync(filepath);
    logger('cleanExpiredFiles', filepath);
  });
};
