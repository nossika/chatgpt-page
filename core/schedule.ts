import { CronJob } from 'cron';
import config from '@/config';
import { cleanExpiredFiles } from '@/util/file';

export const startSchedule = () => {
  // 清理 tmp 目录的过期文件，每个小时执行一次
  const cleanJob = CronJob.from({
    cronTime: '0 0 * * * *',
    onTick: () => {
      console.log(`[cleanJob] run: ${config.tmpFilePath}`);
      cleanExpiredFiles(config.tmpFilePath, config.tmpFileExpiredMs);
    },
    runOnInit: true,
  });
  cleanJob.start();
};
