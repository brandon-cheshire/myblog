import 'dotenv/config';
import { App } from './app.js';

App.create().catch((err) => {
  console.error(err);
  process.exit(1);
});
