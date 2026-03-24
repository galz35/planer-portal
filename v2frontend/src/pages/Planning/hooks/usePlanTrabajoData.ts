import { useState, useEffect, useCallback } from 'react';
import { clarityService } from '../../../services/clarity.service';
import type { Tarea, Proyecto } from '../../../types/modelos';
import type { TeamMember } from '../../../types/plan-trabajo.types';
import { useToast } from '../../../context/ToastContext';

export const usePlanTrabajoData = (projectIdFromUrl: string | null) => {
    const { showToast } = useToast();
    const [projects, setProjects] = useState<Proyecto[]>([]);
    const [selectedProject, setSelectedProject] = useState<Proyecto | null>(null);
    const [tasks, setTasks] = useState<Tarea[]>([]);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [allUsers, setAllUsers] = useState<TeamMember[]>([]);
    const [hierarchyCatalog, setHierarchyCatalog] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);

    const loadTasks = useCallback(async () => {
        if (!selectedProject) {
            setTasks([]);
            return [];
        }
        setLoadingTasks(true);
        try {
            const res = await clarityService.getProyectosTareas(selectedProject!.idProyecto);
            const sortedTasks = (res || []).sort((a, b) => {
                const dateA = a.fechaInicioPlanificada ? new Date(a.fechaInicioPlanificada).getTime() : (a.fechaObjetivo ? new Date(a.fechaObjetivo).getTime() : 8640000000000000);
                const dateB = b.fechaInicioPlanificada ? new Date(b.fechaInicioPlanificada).getTime() : (b.fechaObjetivo ? new Date(b.fechaObjetivo).getTime() : 8640000000000000);
                if (dateA !== dateB) return dateA - dateB;
                return b.idTarea - a.idTarea;
            });
            setTasks(sortedTasks);
            return sortedTasks;
        } catch (error) {
            console.error(error);
            showToast('Error cargando tareas', 'error');
            return [];
        } finally {
            setLoadingTasks(false);
        }
    }, [selectedProject, showToast]);

    useEffect(() => {
        const loadInitial = async () => {
            setLoading(true);
            try {
                const [projsRes, teamRes, catalog, usersRes] = await Promise.all([
                    clarityService.getProyectos(),
                    clarityService.getMyTeam(),
                    clarityService.getCatalogoOrganizacion(),
                    clarityService.getEmpleadosSelector()
                ]);

                const projs = (projsRes as any)?.items || projsRes || [];
                setProjects(projs);
                setHierarchyCatalog(catalog || []);

                if (projs && projs.length > 0) {
                    if (projectIdFromUrl) {
                        const target = projs.find((p: any) => p.idProyecto === Number(projectIdFromUrl));
                        if (target) setSelectedProject(target);
                        else setSelectedProject(projs[0]);
                    } else {
                        setSelectedProject(projs[0]);
                    }
                }

                const teamArrayRaw = teamRes || [];
                const teamArray = teamArrayRaw.map((m: any) => ({
                    ...m,
                    nombre: m.nombre || m.nombreCompleto || 'Sin Nombre'
                }));
                setTeam(teamArray);

                if (Array.isArray(usersRes)) {
                    const unique = Array.from(new Map(usersRes.map((u: any) => [
                        u.idUsuario || (u as any).id,
                        {
                            idUsuario: u.idUsuario || (u as any).id,
                            nombre: u.nombreCompleto || u.nombre,
                            correo: u.correo || '',
                            carnet: u.carnet || ''
                        }
                    ])).values());
                    setAllUsers(unique as TeamMember[]);
                }
            } catch (error: any) {
                console.error('Error loading initial data:', error);
                showToast('Error cargando datos iniciales', 'error');
            } finally {
                setLoading(false);
            }
        };
        loadInitial();
    }, [projectIdFromUrl]);

    return {
        projects, setProjects,
        selectedProject, setSelectedProject,
        tasks, setTasks,
        team, setTeam,
        allUsers, setAllUsers,
        hierarchyCatalog, setHierarchyCatalog,
        loading, setLoading,
        loadingTasks, setLoadingTasks,
        isSaving, setIsSaving,
        isCreatingSubtask, setIsCreatingSubtask,
        loadTasks
    };
};
