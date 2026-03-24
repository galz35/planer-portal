import { clarityService } from '../../../services/clarity.service';
import type { Tarea, Proyecto } from '../../../types/modelos';
import type { TeamMember } from '../../../types/plan-trabajo.types';

export const usePlanTrabajoActions = (
    tasks: Tarea[],
    setTasks: React.Dispatch<React.SetStateAction<Tarea[]>>,
    selectedProject: Proyecto | null,
    setSelectedProject: React.Dispatch<React.SetStateAction<Proyecto | null>>,
    projects: Proyecto[],
    setProjects: React.Dispatch<React.SetStateAction<Proyecto[]>>,
    team: TeamMember[],
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void,
    loadTasks: () => Promise<Tarea[]>
) => {
    const handleAssign = async (taskId: number, userId: number) => {
        const taskIndex = tasks.findIndex(t => t.idTarea === taskId);
        if (taskIndex === -1) return;

        const oldTasks = [...tasks];
        const updatedTask = { ...tasks[taskIndex] };
        const userObj = team.find(u => u.idUsuario === userId);
        if (userObj) {
            updatedTask.idResponsable = userId;
            updatedTask.responsableNombre = userObj.nombre;
            updatedTask.asignados = [{ idAsignacion: 0, idTarea: taskId, idUsuario: userId, usuario: { nombre: userObj.nombre } } as any];
        }

        const newTasks = [...tasks];
        newTasks[taskIndex] = updatedTask;
        setTasks(newTasks);

        try {
            await clarityService.actualizarTarea(taskId, { idResponsable: userId });
            showToast('Tarea reasignada', 'success');
        } catch (error) {
            setTasks(oldTasks);
            showToast('Error asignando tarea', 'error');
        }
    };

    const handleNewProject = async (newProjectName: string) => {
        if (!newProjectName.trim()) return;
        try {
            await clarityService.postProyecto(newProjectName);
            showToast('Proyecto creado', 'success');
            const projsRes = await clarityService.getProyectos();
            const projs = (projsRes as any)?.items || (Array.isArray(projsRes) ? projsRes : []);
            setProjects(projs);
            const newProj = projs.find((p: any) => p.nombre === newProjectName);
            if (newProj) setSelectedProject(newProj);
            return true;
        } catch (error) {
            showToast('Error creando proyecto', 'error');
            return false;
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        try {
            await clarityService.deleteTarea(taskId);
            setTasks(prev => prev.filter(t => t.idTarea !== taskId));
            showToast('Tarea eliminada', 'success');
        } catch (error) {
            showToast('Error eliminando tarea', 'error');
        }
    };

    const handleQuickSubtask = async (parentId: number, title: string) => {
        if (!title.trim() || !selectedProject) return;
        const parentTask = tasks.find(t => t.idTarea === parentId);
        try {
            await clarityService.postTarea({
                idProyecto: selectedProject.idProyecto,
                titulo: title,
                idTareaPadre: parentId,
                idResponsable: parentTask?.idResponsable
            } as any);
            showToast('Subtarea creada', 'success');
            await loadTasks();
            return true;
        } catch (error) {
            showToast('Error al crear subtarea', 'error');
            return false;
        }
    };

    const handleSaveProjectName = async (idProyecto: number, newName: string) => {
        try {
            await clarityService.updateProyecto(idProyecto, { nombre: newName });
            if (selectedProject?.idProyecto === idProyecto) {
                setSelectedProject({ ...selectedProject, nombre: newName });
            }
            setProjects(projects.map(p => p.idProyecto === idProyecto ? { ...p, nombre: newName } : p));
            showToast('Nombre del proyecto actualizado', 'success');
            return true;
        } catch (error) {
            showToast('Error al actualizar el nombre', 'error');
            return false;
        }
    };

    return {
        handleAssign,
        handleNewProject,
        handleDeleteTask,
        handleQuickSubtask,
        handleSaveProjectName
    };
};
