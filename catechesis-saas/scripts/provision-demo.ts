import { execSync } from 'node:child_process';
import pg from 'pg';
import { fallbackTenants } from '../apps/api/src/demo/fallback-data.js';

function buildTenantUrl(schemaName: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const url = new URL(databaseUrl);
  url.searchParams.set('schema', schemaName);
  return url.toString();
}

async function ensureSchemas() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();
  for (const tenant of fallbackTenants) {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${tenant.schemaName}"`);
  }
  await client.end();
}

async function main() {
  execSync('npx prisma generate --schema prisma/control-plane.prisma', { stdio: 'inherit' });
  execSync('npx prisma generate --schema prisma/tenant.prisma', { stdio: 'inherit' });
  execSync('npx prisma db push --schema prisma/control-plane.prisma', { stdio: 'inherit' });

  await ensureSchemas();

  for (const tenant of fallbackTenants) {
    execSync('npx prisma db push --schema prisma/tenant.prisma', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: buildTenantUrl(tenant.schemaName)
      }
    });
  }

  execSync('tsx scripts/seed-demo.ts', {
    stdio: 'inherit',
    env: process.env
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
