import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckinForm } from './CheckinForm';
import { describe, it, expect, vi } from 'vitest';

// Mock dependencias
vi.mock('../../../context/ToastContext', () => ({
    useToast: () => ({ showToast: vi.fn() })
}));

vi.mock('../../../services/clarity.service', () => ({
    clarityService: {
        postTareaRapida: vi.fn(),
        actualizarTarea: vi.fn(),
        postAvance: vi.fn()
    }
}));

describe('CheckinForm', () => {
    const mockTasks = [
        { idTarea: 1, titulo: 'Task 1', estado: 'Pendiente', idProyecto: 1, prioridad: 'Alta', esfuerzo: 'M', proyecto: { nombre: 'P1' } },
        { idTarea: 2, titulo: 'Task 2', estado: 'Pendiente', idProyecto: 1, prioridad: 'Media', esfuerzo: 'S', proyecto: { nombre: 'P1' } }
    ] as any[];

    const mockOnSubmit = vi.fn();

    it('should render columns correctly', () => {
        render(
            <CheckinForm
                disponibles={mockTasks}
                onSubmit={mockOnSubmit}
                userId={1}
                fecha="2025-01-01"
                bloqueos={[]}
            />
        );
        expect(screen.getByText('Objetivo Principal')).toBeInTheDocument();
        expect(screen.getByText('Para Avanzar')).toBeInTheDocument();
        expect(screen.getByText('Victorias Rápidas')).toBeInTheDocument();
    });

    it('should not submit if Objetivo Principal is empty', async () => {
        render(
            <CheckinForm
                disponibles={mockTasks}
                onSubmit={mockOnSubmit}
                userId={1}
                fecha="2025-01-01"
                bloqueos={[]}
            />
        );

        const submitBtn = screen.getByText('🚀 Lanzar Día');
        fireEvent.click(submitBtn);

        await waitFor(() => {
            // Form should not submit without objetivo principal
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });
    });

    // Note: Testing drag and drop or complex selection needing overlay interaction 
    // is better suited for E2E (Playwright/Cypress) or complex integration tests.
    // Here we verify basic form validation logic.
});
