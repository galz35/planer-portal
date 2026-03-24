import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TaskCard } from './TaskCard';
import type { Tarea } from '../../types/modelos';

describe('TaskCard', () => {
    const mockTask: Tarea = {
        idTarea: 1,
        idCreador: 1, // Fixed: idUsuario -> idCreador
        idProyecto: 1,
        titulo: 'Test Task',
        descripcion: 'Description',
        estado: 'Pendiente',
        prioridad: 'Alta',
        esfuerzo: 'M',
        fechaCreacion: new Date().toISOString(),
        proyecto: { idProyecto: 1, nombre: 'Project Alpha', idNodoDuenio: 1, estado: 'Activo' },
        progreso: 0,
        orden: 1,
        fechaUltActualizacion: new Date().toISOString()
    };

    it('renders task title', () => {
        render(<TaskCard tarea={mockTask} />);
        expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('renders project name', () => {
        render(<TaskCard tarea={mockTask} />);
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    it('renders priority badge', () => {
        render(<TaskCard tarea={mockTask} />);
        expect(screen.getByText(/Alta/)).toBeInTheDocument();
    });
});
