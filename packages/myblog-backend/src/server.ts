import 'dotenv/config';
import { validateEnv } from './utils/validateEnv';
import { initLogging } from './common/utils/app-logger/init-logging';

validateEnv();
initLogging({ isLocal: process.env.NODE_ENV !== 'production' });

const port = parseInt(process.env.PORT || '5000');

async function main() {
  const { App } = await import('./app');
  const app = new App(port);
  app.listen();
}

main();
