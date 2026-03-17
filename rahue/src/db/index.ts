import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "La variable de entorno DATABASE_URL no está definida. Revisa tu archivo .env."
  );
}

// Conexión para queries (pool, max 10 conexiones)
const queryClient = postgres(connectionString, { max: 10 });

// Instancia de Drizzle con schema para relational queries
export const db = drizzle(queryClient, { schema });

// Conexión para migraciones (1 conexión, cierra al terminar)
export const migrationClient = postgres(connectionString, {
  max: 1,
  onnotice: () => {},
});

// Re-exportar schema para conveniencia
export * from "./schema";
