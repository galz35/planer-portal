import { render, screen, waitFor } from '@testing-library/react';
import { RoadmapPage } from './RoadmapPage';
import { clarityService } from '../../services/clarity.service';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import '@testing-library/jest-dom';

// Type Mocking
vi.mock('../../services/clarity.service', () => ({
    clarityService: {
        getProyectos: vi.fn()
    }
}));

const mockProjects = [
    {
        idProyecto: 1,
        nombre: 'Proyecto Alpha',
        estado: 'Activo',
        descripcion: 'Test desc'
    },
    {
        idProyecto: 2,
        nombre: 'Proyecto Beta',
        estado: 'Cerrado',
        descripcion: 'Test desc 2'
    }
];

describe('RoadmapPage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly loading state', () => {
        (clarityService.getProyectos as Mock).mockReturnValue(new Promise(() => { }));
        render(<RoadmapPage />);
        expect(screen.getByText(/Cargando estrategia/i)).toBeInTheDocument();
    });

    it('renders quarters and projects after loading', async () => {
        (clarityService.getProyectos as Mock).mockResolvedValue(mockProjects);

        render(<RoadmapPage />);

        await waitFor(() => {
            expect(screen.queryByText(/Cargando estrategia/i)).not.toBeInTheDocument();
        });

        expect(screen.getByText('Roadmap Estratégico')).toBeInTheDocument();
        expect(screen.getByText('Q1')).toBeInTheDocument();
        expect(screen.getByText('Q2')).toBeInTheDocument();
        expect(screen.getByText('Q3')).toBeInTheDocument();
        expect(screen.getByText('Q4')).toBeInTheDocument();

        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument();
    });

    it('allows changing year', async () => {
        (clarityService.getProyectos as Mock).mockResolvedValue([]);
        render(<RoadmapPage />);

        await waitFor(() => {
            expect(screen.queryByText(/Cargando estrategia/i)).not.toBeInTheDocument();
        });

        const currentYear = new Date().getFullYear().toString();
        expect(screen.getByText(currentYear)).toBeInTheDocument();

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
});
