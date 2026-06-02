import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7: connection URLs live here (not in schema.prisma). Migrate uses
// DIRECT_URL (non-pooled Neon endpoint) to avoid pgbouncer issues; the runtime
// client connects via the driver adapter (see app/lib/server/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
