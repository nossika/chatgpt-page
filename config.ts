import argv from '@/util/argv';

const config = {
  port: argv.port || 8000,
  proxyPort: argv['proxy-port'],
  ipAccessLimitPerMin: 30,
  ipAccessLimitPerDay: 3000,
  ipHeader: 'x-real-ip', // Get ip from the request header, because the request many be proxied.
};

export default config;
