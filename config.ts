import fs from 'node:fs';
import path from 'node:path';
import argv from '@/util/argv';

interface Secret {
  apiKey: string;
  whiteList?: string[];
}

let s;
try {
  s = fs.readFileSync('./secret.json', 'utf-8');
} catch (e) {
  s = '{}';
  console.warn('secret.json not found');
}

const secret: Secret = JSON.parse(s);

const config = {
  port: argv.port || 8000,
  proxyPort: argv['proxy-port'],
  apiAccessLimitPerMin: 10,
  accessLimitPerDay: 200,
  ipHeader: 'x-real-ip', // Get ip from the request header, because the request many be proxied.
  idHeader: 'x-key', // For Secret.whiteList validation
  loggerBackupDays: 7,
  fileSizeLimit: 5 * 1024 * 1024, // 5 MB
  tmpFilePath: path.resolve(__dirname, 'public', 'tmp'),
  tmpFileExpiredMs: 7 * 24 * 60 * 60 * 1000, // 7 days

  apiKey: secret.apiKey || 'empty',
  apiBaseURL: 'https://api.openai.com/v1',
  langModel: 'gpt-4o-mini',

  // apiBaseURL: 'https://api.deepseek.com',
  // langModel: 'deepseek-chat',
  whiteList: secret.whiteList || [],
};

export default config;
