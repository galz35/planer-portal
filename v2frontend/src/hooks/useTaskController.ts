import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { clarityService } from '../services/clarity.service';
import { alerts } from '../utils/alerts';
import { planningService } from '../services/planning.service';
import type { Tarea, Usuario } from '../types/modelos';
import { useAuth } from '../context/AuthContext';

export interface Changes {
    titulo?: string;
    fechaObjetivo?: string | null;
    fechaInicioPlanificada?: string | null;
    descripcion?: string;
    linkEvidencia?: string | null;
    idTareaPadre?: number | null;
    motivo?: string;
}

export const useTaskController = (task: Tarea, onClose: () => void, onUpdate: () => void) => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const currentUserId = user?.idUsuario || 0;

    // -- State --
    const [fullTask, setFullTask] = useState<Tarea | null>(null);
    const [titulo, setTitulo] = useState(task.titulo || '');
    const [progreso, setProgreso] = useState(task.progreso || 0);
    const [descripcion, setDescripcion] = useState(task.descripcion || '');
    const [fechaObjetivo, setFechaObjetivo] = useState(task.fechaObjetivo ? task.fechaObjetivo.split('T')[0] : '');
    const [fechaInicioPlanificada, setFechaInicioPlanificada] = useState(task.fechaInicioPlanificada ? task.fechaInicioPlanificada.split('T')[0] : '');
    const [linkEvidencia, setLinkEvidencia] = useState(task.linkEvidencia || '');
    const [comentario, setComentario] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState<'Main' | 'Block' | 'Reassign' | 'RequestChange'>('Main');
    const [requestedField, setRequestedField] = useState<'fechaObjetivo' | 'fechaInicioPlanificada'>('fechaObjetivo');

    // Planning / Logic State
    const [planningCheck, setPlanningCheck] = useState<{ puedeEditar: boolean; requiereAprobacion: boolean; tipoProyecto: string } | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [idTareaPadre, setIdTareaPadre] = useState<number | null | undefined>(task.idTareaPadre);
    const [team, setTeam] = useState<Usuario[]>([]);

    // Pending Changes (Approval Workflow)
    const [pendingChanges, setPendingChanges] = useState<Changes | null>(null);
    const [showChangeModal, setShowChangeModal] = useState(false);

    // -- Effects --
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const [t, pCheck, logs, workload] = await Promise.all([
                    clarityService.getTaskById(task.idTarea),
                    planningService.checkPermission(task.idTarea),
                    clarityService.getAuditLogsByTask(task.idTarea),
                    clarityService.getWorkload()
                ]);

                if (!mounted) return;

                if (t) {
                    setFullTask(t);
                    setIdTareaPadre(t.idTareaPadre);
                    // Sincronizar estado local con datos frescos del servidor
                    setTitulo(t.titulo || '');
                    setProgreso(t.progreso || 0);
                    setDescripcion(t.descripcion || '');
                    setFechaObjetivo(t.fechaObjetivo ? t.fechaObjetivo.split('T')[0] : '');
                    setFechaInicioPlanificada(t.fechaInicioPlanificada ? t.fechaInicioPlanificada.split('T')[0] : '');
                    setLinkEvidencia(t.linkEvidencia || '');
                }
                setPlanningCheck(pCheck);
                setAuditLogs(logs || []);
                if (workload && workload.users) setTeam(workload.users);
            } catch (error) {
                console.error("Error loading task details", error);
            }
        };
        load();
        return () => { mounted = false; };
    }, [task.idTarea]);

    // -- Actions --

    const handleSaveProgress = async () => {
        setSubmitting(true);
        try {
            const currentTitulo = task.titulo || '';
            const currentFechaObj = task.fechaObjetivo ? task.fechaObjetivo.split('T')[0] : '';
            const currentFechaIni = task.fechaInicioPlanificada ? task.fechaInicioPlanificada.split('T')[0] : '';
            const currentDesc = task.descripcion || '';

            const hasDefinitionsChanged =
                titulo.trim() !== currentTitulo.trim() ||
                descripcion.trim() !== currentDesc.trim() ||
                fechaObjetivo !== currentFechaObj ||
                fechaInicioPlanificada !== currentFechaIni ||
                (linkEvidencia || '') !== (task.linkEvidencia || '') ||
                (idTareaPadre || null) !== (task.idTareaPadre || null);

            if (hasDefinitionsChanged) {
                const isLocked = !!planningCheck?.requiereAprobacion;
                const changingDates = fechaObjetivo !== currentFechaObj || fechaInicioPlanificada !== currentFechaIni || (idTareaPadre || null) !== (task.idTareaPadre || null);

                if (changingDates && isLocked) {
                    setPendingChanges({
                        titulo: titulo.trim() || undefined,
                        fechaObjetivo: fechaObjetivo || null,
                        fechaInicioPlanificada: fechaInicioPlanificada || null,
                        descripcion,
                        linkEvidencia: linkEvidencia || null,
                        idTareaPadre: idTareaPadre || null
                    });
                    setShowChangeModal(true);
                    setSubmitting(false);
                    return;
                }

                await clarityService.actualizarTarea(task.idTarea, {
                    titulo: titulo.trim() || undefined,
                    fechaObjetivo: fechaObjetivo || null,
                    fechaInicioPlanificada: fechaInicioPlanificada || null,
                    descripcion: descripcion || undefined,
                    linkEvidencia: linkEvidencia || null,
                    idTareaPadre: idTareaPadre || null
                });
            }

            // Registrar Avance
            await clarityService.postAvance(task.idTarea, {
                idUsuario: currentUserId,
                progreso,
                comentario: comentario || 'Actualización de progreso'
            });

            showToast('Cambios guardados correctamente', 'success');
            onUpdate();
            onClose();
        } catch (error: any) {
            console.error(error);
            if (error.response?.data?.message?.includes('requiere aprobación')) {
                alerts.error('Cambio Bloqueado', 'Tarea estratégica. Requiere aprobación previa.');
            } else {
                alerts.error('Error al guardar', error.response?.data?.message || error.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const confirmChangeRequest = async (motivo: string) => {
        if (!pendingChanges) return;
        setSubmitting(true);
        try {
            await clarityService.actualizarTarea(task.idTarea, {
                ...pendingChanges,
                motivo
            });
            // Log advancement too
            await clarityService.postAvance(task.idTarea, {
                idUsuario: currentUserId,
                progreso,
                comentario: comentario || 'Solicitud de cambio enviada'
            });

            showToast('Solicitud de cambio enviada', 'success');
            onUpdate();
            onClose();
        } catch (error: any) {
            alerts.error('Error', error.message);
        } finally {
            setSubmitting(false);
            setShowChangeModal(false);
        }
    };

    const addSubtask = async (tituloSub: string) => {
        if (!tituloSub) return;
        try {
            await clarityService.postTarea({
                titulo: tituloSub,
                idProyecto: task.idProyecto,
                idUsuario: task.idResponsable || task.idCreador, // Default owner
                idResponsable: task.idResponsable || task.idCreador,
                prioridad: 'Media',
                esfuerzo: 'S',
                fechaInicioPlanificada: task.fechaInicioPlanificada,
                fechaObjetivo: task.fechaObjetivo,
                idTareaPadre: task.idTarea
            } as any);

            const updated = await clarityService.getTaskById(task.idTarea);
            if (updated) setFullTask(updated);
            onUpdate();
        } catch (e) {
            alerts.error('Error', 'No se pudo crear la subtarea');
        }
    };

    const toggleSubtaskCompletion = async (subtaskId: number, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'Hecha' ? 'Pendiente' : 'Hecha';
            const progreso = newStatus === 'Hecha' ? 100 : 0;

            await clarityService.actualizarTarea(subtaskId, { estado: newStatus, progreso } as any);
            await clarityService.postAvance(subtaskId, {
                idUsuario: task.idCreador,
                progreso,
                comentario: `Subtarea marcada como ${newStatus} desde lista padre`
            });

            const updated = await clarityService.getTaskById(task.idTarea);
            if (updated) setFullTask(updated);
            onUpdate();
        } catch (e) {
            alerts.error('Error', 'No se pudo actualizar la subtarea');
        }
    };

    const handleCreateBlocker = async (params: { reason: string; who: string; userId: number | null }) => {
        if (!params.reason.trim()) return alerts.error('Falta motivo', 'Indica el motivo del bloqueo');
        setSubmitting(true);
        try {
            await clarityService.postBloqueo({
                idOrigenUsuario: task.asignados?.find((a: any) => a.tipo === 'Responsable')?.idUsuario || currentUserId,
                idTarea: task.idTarea,
                motivo: params.reason,
                destinoTexto: params.who || 'Interno',
                idDestinoUsuario: params.userId || undefined,
            });
            showToast('Bloqueo registrado', 'success');
            onUpdate();
            onClose();
        } catch {
            alerts.error('Error', 'No se pudo registrar el bloqueo');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAction = async (accion: 'HechaPorOtro' | 'NoAplica' | 'Posponer', targetUserId?: number) => {
        if (accion === 'Posponer') {
            if (!(await alerts.confirm('¿Posponer?', '¿Deseas mover esta tarea al backlog? Se quitará de tu día.', 'question'))) return;
            await clarityService.actualizarTarea(task.idTarea, { estado: 'Pendiente', fechaObjetivo: null, fechaInicioPlanificada: null });
            onUpdate();
            onClose();
            return;
        }

        if (!(await alerts.confirm('Confirmar acción', '¿Seguro? Esta acción cerrará la tarea permanentemente.'))) return;
        setSubmitting(true);
        try {
            if (accion === 'NoAplica') await clarityService.descartarTarea(task.idTarea);
            else await clarityService.revalidarTarea(task.idTarea, accion, targetUserId);

            showToast(`Tarea ${accion === 'NoAplica' ? 'descartada' : 'revalidada'}`, 'success');
            onUpdate();
            onClose();
        } catch (e: any) {
            alerts.error('Error', e.response?.data?.message || e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReassign = async (targetUserId: number) => {
        if (!targetUserId) return alerts.error('Falta usuario', 'Debes seleccionar un nuevo responsable');
        setSubmitting(true);
        try {
            await clarityService.revalidarTarea(task.idTarea, 'Reasignar', targetUserId);
            showToast('Tarea reasignada', 'success');
            onUpdate();
            onClose();
        } catch {
            alerts.error('Error', 'No se pudo completar la reasignación');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitStrategicChange = async (field: 'fechaObjetivo' | 'fechaInicioPlanificada', value: string, reason: string) => {
        if (!reason.trim()) return alerts.error('Motivo requerido', 'Debes justificar el motivo del cambio estratégico.');
        setSubmitting(true);
        try {
            await planningService.requestChange(task.idTarea, field, value, reason);
            showToast('Solicitud enviada al gerente', 'success');
            setView('Main');
        } catch {
            alerts.error('Error', 'No se pudo enviar la solicitud.');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteComment = async (idLog: number) => {
        if (!(await alerts.confirm('¿Eliminar comentario?', '¿Estás seguro de que deseas eliminar este avance?'))) return;
        try {
            await clarityService.deleteAvance(idLog);
            showToast('Comentario eliminado', 'success');

            // Refresh logic
            const updated = await clarityService.getTaskById(task.idTarea);
            if (updated) setFullTask(updated);
            onUpdate();
        } catch (e: any) {
            alerts.error('Error', 'No se pudo eliminar el comentario');
        }
    };

    return {
        // State
        form: {
            titulo, setTitulo,
            progreso, setProgreso,
            descripcion, setDescripcion,
            fechaObjetivo, setFechaObjetivo,
            fechaInicioPlanificada, setFechaInicioPlanificada,
            linkEvidencia, setLinkEvidencia,
            comentario, setComentario,
            idTareaPadre, setIdTareaPadre
        },
        meta: {
            fullTask,
            planningCheck,
            auditLogs,
            submitting,
            showChangeModal, setShowChangeModal,
            view, setView,
            requestedField, setRequestedField,
            team
        },
        actions: {
            handleSaveProgress,
            confirmChangeRequest,
            addSubtask,
            toggleSubtaskCompletion,
            handleCreateBlocker,
            handleAction,
            handleReassign,
            handleSubmitStrategicChange,
            deleteComment
        }
    };
};
