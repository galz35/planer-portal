/**
 * SERVICIO DE CACHE EN MEMORIA (TTL)
 * ¿QUÉ ES?: Un almacén temporal de datos en la memoria RAM del servidor.
 * ¿PARA QUÉ SE USA?: Para evitar consultar la base de datos por información que no cambia seguido (como la jerarquía de equipo).
 */

type CacheItem<T> = { expira: number; valor: T };

const cache = new Map<string, CacheItem<any>>();

/**
 * Obtiene un valor de la cache si no ha expirado.
 */
export function cacheGet<T>(key: string): T | null {
  const it = cache.get(key);
  if (!it) return null;

  if (Date.now() > it.expira) {
    cache.delete(key);
    return null;
  }

  return it.valor as T;
}

/**
 * Guarda un valor en la cache por un tiempo determinado (TTL).
 */
export function cacheSet<T>(key: string, valor: T, ttlMs: number) {
  cache.set(key, { valor, expira: Date.now() + ttlMs });
}

/**
 * Limpieza automática cada minuto para que no se llene la memoria.
 */
setInterval(() => {
  const now = Date.now();
  for (const [k, it] of cache.entries()) {
    if (now > it.expira) cache.delete(k);
  }
}, 60_000).unref();
