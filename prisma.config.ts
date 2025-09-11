import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    // tsx exécute ton fichier; --env-file charge .env pour le seed
    seed: "tsx --env-file=.env prisma/seed.ts",
  },
});
