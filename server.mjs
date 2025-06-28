import { createRequestHandler } from '@remix-run/vercel';
import * as build from './build/index.cjs';

export default createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
});
