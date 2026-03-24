/**
 * SQL Server Provider - Pool Singleton
 * Maneja la conexión global a SQL Server usando mssql (tedious)
 */
import * as sql from 'mssql';
import { ConfigService } from '@nestjs/config';

let pool: sql.ConnectionPool | null = null;
let poolPromise: Promise<sql.ConnectionPool> | null = null;

/**
 * Configuración del pool de conexiones
 */
function getConfig(configService?: ConfigService): sql.config {
  const encrypt =
    configService?.get('MSSQL_ENCRYPT') === 'true' ||
    process.env.MSSQL_ENCRYPT === 'true';

  const trustServerCertificate =
    configService?.get('MSSQL_TRUST_CERT') === 'true' ||
    process.env.MSSQL_TRUST_CERT === 'true';

  return {
    server:
      configService?.get('MSSQL_HOST') || process.env.MSSQL_HOST || 'localhost',
    port: parseInt(
      configService?.get('MSSQL_PORT') || process.env.MSSQL_PORT || '1433',
    ),
    user: configService?.get('MSSQL_USER') || process.env.MSSQL_USER,
    password:
      configService?.get('MSSQL_PASSWORD') || process.env.MSSQL_PASSWORD,
    database:
      configService?.get('MSSQL_DATABASE') || process.env.MSSQL_DATABASE,
    options: {
      encrypt,
      trustServerCertificate,
      enableArithAbort: true,
    },
    pool: {
      max: 20,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: 30000, // Aumentar un poco para redes inestables
    requestTimeout: 120000, // Aumentar un poco
  };
}

/**
 * Obtiene el pool de conexiones (singleton)
 * Si no existe, lo crea. Si ya existe, lo reutiliza.
 */
export async function obtenerPoolSql(
  configService?: ConfigService,
): Promise<sql.ConnectionPool> {
  // 1. Si ya tenemos un pool conectado, lo devolvemos inmediatamente
  if (pool && pool.connected) {
    return pool;
  }

  // 2. Si ya hay una promesa en curso, la devolvemos para evitar múltiples intentos simultáneos
  if (poolPromise) {
    return poolPromise;
  }

  const config = getConfig(configService);
  console.log(`[DB] Iniciando conexión a SQL Server (${config.server})...`);

  // 3. Crear la promesa de conexión
  poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((p) => {
      pool = p;
      console.log('[DB] ✅ SQL Server Conectado');

      // Configuraciones iniciales de la sesión
      p.request()
        .query('SET QUOTED_IDENTIFIER ON')
        .catch((e) => {
          console.error(
            '[DB] ⚠️ Error al ejecutar SET QUOTED_IDENTIFIER ON:',
            e.message,
          );
        });

      // Limpieza en errores fatales
      p.on('error', (err) => {
        console.error('🔥 [DB] SQL Pool Error:', err.message);
        pool = null;
        poolPromise = null;
      });

      return p;
    })
    .catch((err) => {
      console.error(`❌ [DB] Error de conexión: ${err.message}`);
      pool = null;
      poolPromise = null; // Importantísimo: resetear para permitir reintentos
      throw err;
    });

  return poolPromise;
}

/**
 * Cierra el pool de conexiones (para shutdown)
 */
export async function cerrarPoolSql(): Promise<void> {
  if (pool) {
    console.log('[DB] Cerrando pool SQL Server...');
    await pool.close();
    pool = null;
    poolPromise = null;
    console.log('[DB] Pool cerrado');
  }
}

/**
 * Verifica si el pool está conectado
 */
export function isPoolConnected(): boolean {
  return pool?.connected ?? false;
}

// Exportar tipos de mssql para uso en repos
export { sql };
