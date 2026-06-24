import { listen } from '@colyseus/tools';
import appConfig from './app.config';

// Reads PORT from the environment (defaults to 2567).
listen(appConfig);
