/**
 * MarcajeWebPage — Página wrapper para el módulo de marcaje
 * Diseño premium con header limpio y SEO tags
 */
import { AttendanceManager } from './AttendanceManager';

export function MarcajeWebPage() {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-bg-primary, #f8fafc)',
        }}>
            <AttendanceManager />
        </div>
    );
}

export default MarcajeWebPage;
