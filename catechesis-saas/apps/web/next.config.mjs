import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = process.env.NODE_ENV !== 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: isDevelopment ? '.next-dev' : '.next',
  outputFileTracingRoot: path.join(dirname, '../../'),
  transpilePackages: ['@catechesis-saas/types', '@catechesis-saas/config', '@catechesis-saas/ui']
};

export default nextConfig;
