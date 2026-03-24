import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tarea, Proyecto } from '../../../types/modelos';
import type { ViewMode } from '../../../types/plan-trabajo.types';

function useDebouncedValue<T>(value: T, ms = 200) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

export const usePlanTrabajoFilters = (tasks: Tarea[], projects: Proyecto[], hierarchyCatalog: any[], initialViewMode: ViewMode) => {
    // Mode & Selection
    const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

    // Filters
    const [filterText, setFilterText] = useState(''); // Global
    const [filterAssignee, setFilterAssignee] = useState<number | ''>(''); // Legacy Global
    const [currentPage, setCurrentPage] = useState(1);

    const [colFilters, setColFilters] = useState({
        titulo: '',
        prioridad: '',
        estado: '',
        asignado: '', // ID as string
        fecha: ''     // string match or date
    });

    const [hFilters, setHFilters] = useState({ gerencia: '', subgerencia: '', area: '' });
    const [projectSearch, setProjectSearch] = useState('');
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

    const toggleExpand = (taskId: number) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    // Derived hierarchy state
    const uniqueGerencias = useMemo(() => Array.from(new Set(hierarchyCatalog.map((c: any) => c.ogerencia).filter(Boolean))), [hierarchyCatalog]);

    const uniqueSubgerencias = useMemo(() => {
        if (!hFilters.gerencia) return [];
        return Array.from(new Set(hierarchyCatalog.filter((c: any) => c.ogerencia === hFilters.gerencia).map((c: any) => c.subgerencia).filter(Boolean)));
    }, [hierarchyCatalog, hFilters.gerencia]);

    const uniqueAreas = useMemo(() => {
        if (!hFilters.subgerencia) return [];
        return Array.from(new Set(hierarchyCatalog.filter((c: any) => c.subgerencia === hFilters.subgerencia).map((c: any) => c.area).filter(Boolean)));
    }, [hierarchyCatalog, hFilters.subgerencia]);

    const filteredProjects = useMemo(() => {
        const tokens = projectSearch.toLowerCase().split(/\s+/).filter(Boolean);
        return projects.filter(p => {
            const name = p.nombre.toLowerCase();
            const matchText = tokens.every(token => name.includes(token));
            const matchG = !hFilters.gerencia || p.gerencia === hFilters.gerencia;
            const matchS = !hFilters.subgerencia || p.subgerencia === hFilters.subgerencia;
            const matchA = !hFilters.area || p.area === hFilters.area;
            return matchText && matchG && matchS && matchA;
        });
    }, [projects, projectSearch, hFilters]);

    const debouncedFilterText = useDebouncedValue(filterText, 300);

    const finalFilteredTasks = useMemo(() => {
        const q = (debouncedFilterText || "").trim().toLowerCase();
        const fTitle = colFilters.titulo.toLowerCase();
        const fPrio = colFilters.prioridad;
        const fStatus = colFilters.estado;
        const fAssignee = colFilters.asignado ? Number(colFilters.asignado) : null;
        const fDate = colFilters.fecha.toLowerCase();

        return tasks.filter(t => {
            const title = t.titulo.toLowerCase();
            const matchGlobal = (() => {
                if (!q) return true;
                const tokens = q.split(/\s+/).filter(Boolean);
                return tokens.every(token => title.includes(token));
            })();
            
            const matchLegacyAssignee = filterAssignee === '' || t.idResponsable === Number(filterAssignee) || t.asignados?.some(a => a.idUsuario === Number(filterAssignee));
            
            const matchTitle = (() => {
                if (!fTitle) return true;
                const tokens = fTitle.split(/\s+/).filter(Boolean);
                return tokens.every(token => title.includes(token));
            })();
            
            const matchPrio = !fPrio || t.prioridad === fPrio;
            const matchStatus = !fStatus || t.estado === fStatus;

            let matchAssignee = true;
            if (fAssignee) {
                matchAssignee = t.idResponsable === fAssignee || (t.asignados && t.asignados.some(a => a.idUsuario === fAssignee)) || false;
            }

            let matchDate = true;
            if (fDate) {
                const dateStr = t.fechaObjetivo ? format(new Date(t.fechaObjetivo), 'd MMM', { locale: es }).toLowerCase() :
                    (t.fechaInicioPlanificada ? format(new Date(t.fechaInicioPlanificada), 'd MMM', { locale: es }).toLowerCase() : '');
                matchDate = dateStr.includes(fDate);
            }

            return matchGlobal && matchLegacyAssignee && matchTitle && matchPrio && matchStatus && matchAssignee && matchDate;
        });
    }, [tasks, debouncedFilterText, filterAssignee, colFilters]);

    const hierarchyData = useMemo(() => {
        const sortTasksByDate = (a: Tarea, b: Tarea) => {
            // Priorizar fecha de inicio para el ordenamiento
            const dateA = a.fechaInicioPlanificada ? new Date(a.fechaInicioPlanificada).getTime() : (a.fechaObjetivo ? new Date(a.fechaObjetivo).getTime() : 8640000000000000);
            const dateB = b.fechaInicioPlanificada ? new Date(b.fechaInicioPlanificada).getTime() : (b.fechaObjetivo ? new Date(b.fechaObjetivo).getTime() : 8640000000000000);
            if (dateA !== dateB) return dateA - dateB;
            return b.idTarea - a.idTarea;
        };

        const isFiltering = (debouncedFilterText || "").trim() !== '' ||
            filterAssignee !== '' ||
            Object.values(colFilters).some(v => v !== '');

        if (isFiltering) {
            return {
                roots: [...finalFilteredTasks].sort(sortTasksByDate),
                childrenMap: new Map<number, Tarea[]>(),
                isFlat: true
            };
        }

        const roots: Tarea[] = [];
        const childrenMap = new Map<number, Tarea[]>();
        const allIds = new Set(tasks.map(t => t.idTarea));

        tasks.forEach(t => {
            if (t.idTareaPadre && allIds.has(t.idTareaPadre)) {
                if (!childrenMap.has(t.idTareaPadre)) childrenMap.set(t.idTareaPadre, []);
                childrenMap.get(t.idTareaPadre)!.push(t);
            } else {
                roots.push(t);
            }
        });

        roots.sort(sortTasksByDate);
        childrenMap.forEach(kids => kids.sort(sortTasksByDate));

        return { roots, childrenMap, isFlat: false };
    }, [tasks, finalFilteredTasks, debouncedFilterText, filterAssignee]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterText, filterAssignee, colFilters]);

    return {
        viewMode, setViewMode,
        filterText, setFilterText,
        filterAssignee, setFilterAssignee,
        currentPage, setCurrentPage,
        colFilters, setColFilters,
        hFilters, setHFilters,
        projectSearch, setProjectSearch,
        expandedTasks, toggleExpand,
        uniqueGerencias, uniqueSubgerencias, uniqueAreas,
        filteredProjects,
        finalFilteredTasks,
        hierarchyData
    };
};
