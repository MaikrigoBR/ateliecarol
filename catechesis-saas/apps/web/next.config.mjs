import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(dirname, '../../'),
  transpilePackages: ['@catechesis-saas/types', '@catechesis-saas/config', '@catechesis-saas/ui']
};

export default nextConfig;
