import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@repo/db", "@repo/audit", "@repo/rbac", "@repo/ui"],
  experimental: {
    // Workspace packages live outside the app dir; trace from the repo root
    // so the standalone bundle includes them (and the Prisma client).
    outputFileTracingRoot: path.join(appDir, "../../"),
  },
};

export default nextConfig;
