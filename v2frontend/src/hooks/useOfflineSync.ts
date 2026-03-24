/**
 * useOfflineSync — Hook de Sincronización Offline para Marcaje Web
 *
 * Manejo completo de cola offline:
 *  1. Si la red está disponible → envía directo al backend
 *  2. Si no hay red → almacena en localStorage con offline_id
 *  3. Cuando la red vuelve → procesa la cola automáticamente
 *  4. Retry con exponential backoff para errores transitorios
 *  5. Los errores permanentes (4xx) se retiran de la cola
 *
 * El offline_id garantiza idempotencia: si el backend ya procesó
 * ese marcaje, retorna el existente sin crear duplicado.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { marcajeApi, type MarkAttendanceDto, type MarkResult } from '../services/marcajeApi';

// ==========================================
// TYPES
// ==========================================

interface QueueItem {
    id: string;           // UUID generado en el cliente
    data: MarkAttendanceDto;
    timestamp: number;    // Epoch ms cuando se encoló
    retries: number;
    lastError?: string;
    status: 'pending' | 'sending' | 'failed';
}

interface SyncState {
    isOnline: boolean;
    isSyncing: boolean;
    queueLength: number;
    lastSyncAt: string | null;
    lastError: string | null;
}

// ==========================================
// CONSTANTS
// ==========================================

const QUEUE_KEY = 'marcaje_offline_queue';
const SYNC_INTERVAL_MS = 30_000;          // Cada 30 segundos
const MAX_RETRIES = 5;

// ==========================================
// UTILS
// ==========================================

function generateOfflineId(): string {
    return `off-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function loadQueue(): QueueItem[] {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveQueue(queue: QueueItem[]) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function isPermanentError(status?: number): boolean {
    // 4xx excluyendo 408 (timeout) y 429 (rate limit) son permanentes
    if (!status) return false;
    return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

// ==========================================
// HOOK
// ==========================================

export function useOfflineSync() {
    const [state, setState] = useState<SyncState>({
        isOnline: navigator.onLine,
        isSyncing: false,
        queueLength: loadQueue().length,
        lastSyncAt: null,
        lastError: null,
    });

    const syncInProgress = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

    // ==========================================
    // Estado de red online/offline
    // ==========================================
    useEffect(() => {
        const handleOnline = () => {
            setState(prev => ({ ...prev, isOnline: true }));
            processQueue();  // Intentar sync inmediato al volver online
        };

        const handleOffline = () => {
            setState(prev => ({ ...prev, isOnline: false }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // ==========================================
    // Sync periódico
    // ==========================================
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            if (navigator.onLine && loadQueue().length > 0) {
                processQueue();
            }
        }, SYNC_INTERVAL_MS);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // ==========================================
    // Procesar cola
    // ==========================================
    const processQueue = useCallback(async () => {
        if (syncInProgress.current || !navigator.onLine) return;
        syncInProgress.current = true;

        const queue = loadQueue();
        if (queue.length === 0) {
            syncInProgress.current = false;
            return;
        }

        setState(prev => ({ ...prev, isSyncing: true }));

        const remaining: QueueItem[] = [];

        for (const item of queue) {
            try {
                // Asegurar que tiene offline_id para idempotencia
                const dataWithOfflineId = {
                    ...item.data,
                    offline_id: item.id,
                    timestamp: new Date(item.timestamp).toISOString(),
                };

                await marcajeApi.mark(dataWithOfflineId);

                // Éxito — no agregar a remaining (se elimina de la cola)
                console.log(`[OfflineSync] ✅ Sincronizado: ${item.id}`);

            } catch (err: any) {
                const status = err?.response?.status;

                if (isPermanentError(status)) {
                    // Error permanente — descartar de la cola
                    console.warn(`[OfflineSync] ❌ Error permanente (${status}), descartando: ${item.id}`);
                    continue;
                }

                // Error transitorio — reintentar
                item.retries += 1;
                item.lastError = err?.message || 'Error desconocido';

                if (item.retries >= MAX_RETRIES) {
                    console.warn(`[OfflineSync] ❌ Max retries alcanzado, descartando: ${item.id}`);
                    continue;
                }

                item.status = 'failed';
                remaining.push(item);
            }
        }

        saveQueue(remaining);

        setState(prev => ({
            ...prev,
            isSyncing: false,
            queueLength: remaining.length,
            lastSyncAt: new Date().toISOString(),
            lastError: remaining.length > 0 ? remaining[remaining.length - 1].lastError || null : null,
        }));

        syncInProgress.current = false;
    }, []);

    // ==========================================
    // Enviar marcaje (con fallback a cola)
    // ==========================================
    const sendMark = useCallback(async (
        data: MarkAttendanceDto
    ): Promise<{ success: boolean; result?: MarkResult; queued?: boolean; offlineId?: string }> => {

        const offlineId = generateOfflineId();
        const dataWithId = { ...data, offline_id: offlineId };

        // Intentar envío directo si hay red
        if (navigator.onLine) {
            try {
                const result = await marcajeApi.mark(dataWithId);
                return { success: true, result };
            } catch (err: any) {
                const status = err?.response?.status;

                // Si es error permanente (validación), no encolar
                if (isPermanentError(status)) {
                    return { success: false };
                }

                // Error de red/transitorio → encolar
                console.warn('[OfflineSync] Error de red, encolando...');
            }
        }

        // Encolar para sync posterior
        const queue = loadQueue();
        const item: QueueItem = {
            id: offlineId,
            data,
            timestamp: Date.now(),
            retries: 0,
            status: 'pending',
        };
        queue.push(item);
        saveQueue(queue);

        setState(prev => ({ ...prev, queueLength: queue.length }));

        return { success: true, queued: true, offlineId };
    }, []);

    // ==========================================
    // Forzar sync manual
    // ==========================================
    const forceSync = useCallback(() => {
        processQueue();
    }, [processQueue]);

    // ==========================================
    // Limpiar cola (admin/debug)
    // ==========================================
    const clearQueue = useCallback(() => {
        saveQueue([]);
        setState(prev => ({ ...prev, queueLength: 0, lastError: null }));
    }, []);

    return {
        ...state,
        sendMark,
        forceSync,
        clearQueue,
    };
}
