import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

type TenantClient = {
  $disconnect(): Promise<void>;
  tenantSetting: {
    findMany(): Promise<Array<{ key: string; value: unknown }>>;
  };
  course: {
    findMany(args: unknown): Promise<Array<{ id: string; slug: string; title: string; isPublished: boolean; modules: unknown[] }>>;
  };
  enrollment: {
    create(args: unknown): Promise<{ id: string }>;
  };
  subscription: {
    create(args: unknown): Promise<{ id: string }>;
  };
};

function buildTenantUrl(schemaName: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to create tenant Prisma clients');
  }

  const url = new URL(databaseUrl);
  url.searchParams.set('schema', schemaName);
  return url.toString();
}

@Injectable()
export class TenantClientFactory implements OnModuleDestroy {
  private readonly clients = new Map<string, Promise<TenantClient>>();

  async getClient(schemaName: string) {
    const cached = this.clients.get(schemaName);
    if (cached) {
      return cached;
    }

    const clientPromise = (async () => {
      const moduleUrl = pathToFileURL(
        path.resolve(process.cwd(), 'apps/api/generated/tenant/index.js')
      ).href;
      const module = (await import(moduleUrl)) as {
        PrismaClient: new (args: { datasources: { db: { url: string } } }) => TenantClient;
      };

      return new module.PrismaClient({
        datasources: {
          db: {
            url: buildTenantUrl(schemaName)
          }
        }
      });
    })();

    this.clients.set(schemaName, clientPromise);
    return clientPromise;
  }

  async onModuleDestroy() {
    await Promise.all(
      Array.from(this.clients.values()).map(async (clientPromise) => {
        const client = await clientPromise;
        await client.$disconnect();
      })
    );
  }
}
