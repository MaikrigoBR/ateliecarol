import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

type ControlPlaneClient = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  tenant: {
    findMany(args: unknown): Promise<any[]>;
  };
};

@Injectable()
export class ControlPlanePrismaService implements OnModuleDestroy {
  private clientPromise?: Promise<ControlPlaneClient>;

  async client() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const moduleUrl = pathToFileURL(
          path.resolve(process.cwd(), 'apps/api/generated/control-plane/index.js')
        ).href;
        const module = (await import(moduleUrl)) as { PrismaClient: new () => ControlPlaneClient };
        const client = new module.PrismaClient();

        try {
          await client.$connect();
        } catch {
          // Allows the API to continue with fallback data when Postgres is unavailable.
        }

        return client;
      })();
    }

    return this.clientPromise;
  }

  async onModuleDestroy() {
    if (!this.clientPromise) {
      return;
    }

    const client = await this.clientPromise;
    await client.$disconnect();
  }
}
