import fs from 'node:fs';
import path from 'node:path';

export const cleanExpiredFiles = (folder: string, expiredMs: number) => {
  const filenames = fs.readdirSync(folder);
  filenames.forEach(filename => {
    const filepath = path.resolve(folder, filename);
    const stats = fs.statSync(filepath);
    if (!stats.isFile()) return;
    const expired = (Date.now() - stats.birthtimeMs) > expiredMs;
    if (!expired) return;
    fs.rmSync(filepath);
    console.log(`removed file: ${filepath}`);
  });
};



