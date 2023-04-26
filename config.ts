import argv from '@/util/argv';

const config = {
  port: argv.port || 8000,
  proxyPort: argv['proxy-port'],
  apiAccessLimitPerMin: 5,
  accessLimitPerDay: 100,
  ipHeader: 'x-real-ip', // Get ip from the request header, because the request many be proxied.
};

export default config;
