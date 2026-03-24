/**
 * ARCHITECTURAL NOTE:
 * Base Repository for SQL Server (Node.js + mssql)
 *
 * Design Principles:
 * 1. Singleton Pool: Prevents connection leaks and handles re-connection.
 * 2. Stored Procedures First: Encourages strict SP usage over inline SQL.
 * 3. Non-Blocking Observability: Slow logs are buffered and flushed asynchronously.
 * 4. Security: Parameter logging is sanitized to prevent credential leakage.
 * 5. Type Safety: Strict exports for SQL types.
 */

import { Logger } from '@nestjs/common';
import * as sql from 'mssql';
import { obtenerPoolSql } from './sqlserver.provider';

// ============================
// CONFIGURATION & CONSTANTS
// ============================
const CONFIG = {
  SLOW_QUERY_THRESHOLD_MS: 1000,
  LOG_FLUSH_INTERVAL_MS: 5000,
  MAX_LOG_QUEUE_SIZE: 500,
  MAX_TEXT_LEN: 4000, // Max NVarChar param size safety
};

const logger = new Logger('BaseRepo');

// ============================
// SINGLETON POOL
// ============================
const poolPromise: Promise<sql.ConnectionPool> | null = null;

async function getPool(): Promise<sql.ConnectionPool> {
  const p = await obtenerPoolSql();
  if (!p || !p.connected) {
    throw new Error('No se pudo establecer conexión con SQL Server');
  }
  return p;
}

function resetPool() {
  // Ya no es necesario resetear localmente, sqlserver.provider se encarga
  logger.warn('🔄 SQL Pool Reset (BaseRepo proxy)');
}

function isConnectionError(e: any): boolean {
  const msg = (e?.message || '').toLowerCase();
  const code = (e?.code || '').toLowerCase();
  return (
    msg.includes('closed') ||
    msg.includes('broken') ||
    msg.includes('socket') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    code === 'etcl' ||
    code === 'esocket'
  );
}

// ============================
// TYPE DEFINITIONS
// ============================
export type ParamInput =
  | any
  | {
      valor: any;
      tipo?: sql.ISqlType;
    };

export type ParamsMap = Record<string, ParamInput>;

// ============================
// OBSERVABILITY (Slow Log & Sanitization)
// ============================
const SENSITIVE_KEYS = ['password', 'clave', 'token', 'secret', 'credencial'];

function sanitizeParamsForLog(params?: ParamsMap): any {
  if (!params) return null;
  const copy: any = {};
  for (const [key, val] of Object.entries(params)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      copy[key] = '[REDACTED]';
    } else {
      // Extract clean value from object wrapper if needed
      const raw =
        val && typeof val === 'object' && 'valor' in val ? val.valor : val;
      // Truncate huge strings for logs
      copy[key] =
        typeof raw === 'string' && raw.length > 500
          ? raw.substring(0, 500) + '...[TRUNC]'
          : raw;
    }
  }
  return copy;
}

// Buffer for Slow Logs
type SlowLogItem = {
  duration: number;
  command: string;
  type: 'SP' | 'QUERY';
  params: string; // JSON
  origin: string;
  date: Date;
};

const logQueue: SlowLogItem[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let slowTableExists = true; // Optimistic assumption

function enqueueSlowLog(item: SlowLogItem) {
  if (logQueue.length >= CONFIG.MAX_LOG_QUEUE_SIZE) return; // Drop if full to protect memory
  logQueue.push(item);

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushLogs().catch((e) => logger.error('Error flushing logs', e));
    }, CONFIG.LOG_FLUSH_INTERVAL_MS);
  }
}

async function flushLogs() {
  if (logQueue.length === 0) return;
  const batch = logQueue.splice(0, logQueue.length); // Drain queue

  try {
    const pool = await getPool();

    // Check table existence lazily if previously failed or first run implies optimistic
    if (!slowTableExists) return;

    // Construct Batch Insert (more efficient than N roundtrips)
    const request = pool.request();

    // Note: This relies on the table existing. If not, we switch to console mode.
    // Dynamic SQL construction for batch insert is safe here as we bind parameters
    let valuesClause = '';

    batch.forEach((log, index) => {
      const pIdx = index;
      request.input(`d${pIdx}`, sql.Int, log.duration);
      request.input(
        `s${pIdx}`,
        sql.NVarChar(sql.MAX),
        log.command.substring(0, CONFIG.MAX_TEXT_LEN),
      );
      request.input(`t${pIdx}`, sql.NVarChar(20), log.type);
      request.input(`p${pIdx}`, sql.NVarChar(sql.MAX), log.params);
      request.input(`o${pIdx}`, sql.NVarChar(200), log.origin || 'backend');

      valuesClause += `(@d${pIdx}, @s${pIdx}, @t${pIdx}, @p${pIdx}, GETDATE(), @o${pIdx}),`;
    });

    // Remove trailing comma
    valuesClause = valuesClause.slice(0, -1);

    const sqlText = `
      INSERT INTO dbo.p_SlowQueries (duracionMS, sqlText, tipo, parametros, fecha, origen)
      VALUES ${valuesClause}
    `;

    await request.query(sqlText);
  } catch (error: any) {
    if (error?.message?.includes('Invalid object name')) {
      slowTableExists = false;
      logger.warn(
        '⚠️ Table p_SlowQueries not found. Dumping to console instead.',
      );
      batch.forEach((b) =>
        logger.warn(`[SLOW-SQL] (${b.duration}ms) ${b.command}`),
      );
    } else {
      logger.error('Failed to flush slow logs', error);
    }
  }
}

// ============================
// CORE EXECUTION LOGIC
// ============================

function bindParams(req: sql.Request, params?: ParamsMap) {
  if (!params) return;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      // Skip undefined, or bind as custom null? mssql ignores undefined usually,
      // but explicitly sending null is safer for SPs expecting parameters.
      req.input(key, null);
    } else if (value && typeof value === 'object' && 'valor' in value) {
      // Typed Parameter
      req.input(key, value.tipo || sql.NVarChar, value.valor);
    } else {
      // Auto-inferred
      req.input(key, value);
    }
  }
}

/**
 * Execute a Stored Procedure securely.
 * @param spName - Name of the Stored Procedure
 * @param params - Key-value map of parameters
 * @param tx - Optional transaction scope
 * @param origin - Caller context for logging
 */
export async function ejecutarSP<T = any>(
  spName: string,
  params?: ParamsMap,
  tx?: sql.Transaction,
  origin: string = 'unknown',
): Promise<T[]> {
  const start = Date.now();
  try {
    const connection = await getPool();
    const request = tx ? new sql.Request(tx) : connection.request();

    bindParams(request, params);

    const result = await request.execute<T>(spName);

    const duration = Date.now() - start;
    if (duration > CONFIG.SLOW_QUERY_THRESHOLD_MS) {
      enqueueSlowLog({
        duration,
        command: `EXEC ${spName}`,
        type: 'SP',
        params: JSON.stringify(sanitizeParamsForLog(params)),
        origin,
        date: new Date(),
      });
    }

    return result.recordset || [];
  } catch (error: any) {
    const duration = Date.now() - start;
    logger.error(`❌ SP Error [${spName}] (${duration}ms): ${error.message}`, {
      params: sanitizeParamsForLog(params),
      code: error.code,
    });

    if (isConnectionError(error)) resetPool();
    throw error;
  }
}

/**
 * Execute a Stored Procedure expecting Multiple Result Sets.
 */
export async function ejecutarSPMulti<T = any>(
  spName: string,
  params?: ParamsMap,
  tx?: sql.Transaction,
  origin: string = 'unknown',
): Promise<T[][]> {
  const start = Date.now();
  try {
    const connection = await getPool();
    const request = tx ? new sql.Request(tx) : connection.request();

    bindParams(request, params);

    const result = await request.execute<T>(spName);

    const duration = Date.now() - start;
    if (duration > CONFIG.SLOW_QUERY_THRESHOLD_MS) {
      enqueueSlowLog({
        duration,
        command: `EXEC ${spName} (MULTI)`,
        type: 'SP',
        params: JSON.stringify(sanitizeParamsForLog(params)),
        origin,
        date: new Date(),
      });
    }

    return result.recordsets || [];
  } catch (error: any) {
    const duration = Date.now() - start;
    logger.error(
      `❌ SP Multi Error [${spName}] (${duration}ms): ${error.message}`,
      {
        params: sanitizeParamsForLog(params),
        code: error.code,
      },
    );

    if (isConnectionError(error)) resetPool();
    throw error;
  }
}

/**
 * Creates a raw mssql Request object.
 */
export async function crearRequest(tx?: sql.Transaction): Promise<sql.Request> {
  const connection = await getPool();
  return tx ? new sql.Request(tx) : connection.request();
}

/**
 * Executes a raw query (DEPRECATED: Use SPs prefers).
 * Kept for maintenance or rare dynamic needs.
 */
export async function ejecutarQuery<T = any>(
  sqlText: string,
  params?: ParamsMap,
  tx?: sql.Transaction,
  origin: string = 'legacy',
): Promise<T[]> {
  const start = Date.now();
  try {
    if (sqlText.toLowerCase().includes('exec ')) {
      logger.warn(
        `⚠️ Inline EXEC detected in ejecutaQuery. Please use ejecutaSP for: ${sqlText.substring(0, 50)}...`,
      );
    }

    const connection = await getPool();
    const request = tx ? new sql.Request(tx) : connection.request();

    bindParams(request, params);

    const result = await request.query<T>(sqlText);

    const duration = Date.now() - start;
    if (duration > CONFIG.SLOW_QUERY_THRESHOLD_MS) {
      enqueueSlowLog({
        duration,
        command: sqlText,
        type: 'QUERY',
        params: JSON.stringify(sanitizeParamsForLog(params)),
        origin,
        date: new Date(),
      });
    }

    return result.recordset || [];
  } catch (error: any) {
    logger.error(`❌ Query Error: ${error.message}`, {
      sql: sqlText.substring(0, 100),
    });
    if (isConnectionError(error)) resetPool();
    throw error;
  }
}

/**
 * Transaction Wrapper
 * Ensures Commit/Rollback is handled automatically.
 */
export async function conTransaccion<T>(
  work: (tx: sql.Transaction) => Promise<T>,
): Promise<T> {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();
    const result = await work(tx);
    await tx.commit();
    return result;
  } catch (error) {
    try {
      if (tx) await tx.rollback();
    } catch (rbError) {
      logger.error('Rollback failed', rbError);
    }
    throw error;
  }
}

// ============================
// EXPORTS (Strict Typing)
// ============================
export { sql };
export const Int = sql.Int;
export const BigInt = sql.BigInt;
export const NVarChar = sql.NVarChar;
export const Bit = sql.Bit;
export const DateTime = sql.DateTime;
export const DateOnly = sql.Date;
export const SqlDate = sql.Date; // Legacy Alias
export const Decimal = sql.Decimal;
export const Float = sql.Float;
export const Text = sql.Text;
export const Xml = sql.Xml;

export const execute = ejecutarSP; // Alias for English preference
