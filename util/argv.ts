import minimist from 'minimist';

interface Argv {
  port?: number;
  'proxy-port'?: number;
}

const argv: Argv = minimist(process.argv.slice(2));

export default argv;
