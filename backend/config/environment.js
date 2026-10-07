import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Load before modules that construct clients or choose production security defaults.
// Resolve relative to this file so `node Backend/server.js` also works from the repo root.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
