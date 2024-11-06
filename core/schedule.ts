import { CronJob } from 'cron';
import config from '@/config';
import { cleanExpiredFiles } from '@/util/file';
import { logger } from '@/util/logger';

// 清理 tmp 目录的过期文件，每个小时执行一次
const cleanJob = CronJob.from({
  cronTime: '0 0 * * * *',
  onTick: () => {
    logger('cleanJob', `clean ${config.tmpFilePath}`);
    cleanExpiredFiles(config.tmpFilePath, config.tmpFileExpiredMs);
  },
  runOnInit: true,
});

export const startSchedule = () => {
  cleanJob.start();
};
