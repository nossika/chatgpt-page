import minimist from 'minimist';

const argv: {
  [key: string]: any;
} = minimist(process.argv.slice(2));

export default argv;