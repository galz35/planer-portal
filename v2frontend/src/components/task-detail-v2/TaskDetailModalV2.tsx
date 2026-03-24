import React from 'react';
import { createPortal } from 'react-dom';
import { Save } from 'lucide-react';
import type { Tarea } from '../../types/modelos';
import { useTaskController } from '../../hooks/useTaskController';
import { TaskHeader } from './TaskHeader';
import { TaskPlanningPanel } from './TaskPlanningPanel';
import { TaskExecutionPanel } from './TaskExecutionPanel';
import { SolicitudCambioModal } from '../ui/SolicitudCambioModal'; // Reuse existing
import { TaskManagementActions } from './TaskManagementActions';
import { BlockView } from './BlockView';
import { ReassignView } from './ReassignView';
import { StrategicRequestView } from './StrategicRequestView';
import { TaskParticipantsPanel } from './TaskParticipantsPanel';
import { TaskReminderPanel } from './TaskReminderPanel';

interface Props {
    task: Tarea;
    onClose: () => void;
    onUpdate: () => void;
    mode?: 'planning' | 'execution';
    disableEdit?: boolean;
}

export const TaskDetailModalV2: React.FC<Props> = ({ task, onClose, onUpdate, mode = 'execution', disableEdit = false }) => {
    // 1. Hook de Lógica (Controller)
    const { form, meta, actions } = useTaskController(task, onClose, onUpdate);

    // const [requestField, setRequestField] = useState<'fechaObjetivo' | 'fechaInicioPlanificada'>('fechaObjetivo');
    // const [view, setView] = useState<'Main' | 'RequestChange'>('Main'); // Simple view switching

    // Derived
    const isStrategic = meta.planningCheck?.tipoProyecto === 'Estrategico';
    const isLocked = !!meta.planningCheck?.requiereAprobacion;

    return createPortal(
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-start justify-center p-4 pt-[5vh] md:pt-[10vh] animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-clarity-surface w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-900/5 border border-slate-200">

                {/* HEADER */}
                <TaskHeader
                    task={task}
                    titulo={form.titulo}
                    setTitulo={form.setTitulo}
                    onClose={onClose}
                    mode={mode}
                    isStrategic={isStrategic}
                    subtasksCount={meta.fullTask?.subtareas?.length}
                />

                {/* TABS OCULTOS POR SOLICITUD - Solo Información visible por defecto */}
                {/* 
                <div className="flex px-6 border-b bg-slate-50/30 gap-6 shrink-0">
                    ... (tabs buttons)
                </div> 
                */}

                {/* CONTENT AREA */}
                <div className="p-4 md:p-6 overflow-y-auto bg-white flex-1 relative">
                    {meta.showChangeModal && (
                        <SolicitudCambioModal
                            isOpen={true}
                            onClose={() => meta.setShowChangeModal(false)}
                            onConfirm={actions.confirmChangeRequest}
                            campo="fechaObjetivo"
                            valorAnterior=""
                            valorNuevo=""
                        />
                    )}

                    {/* VIEW SWITCHER */}
                    {meta.view === 'Block' && (
                        <BlockView
                            team={meta.team}
                            submitting={meta.submitting}
                            onCancel={() => meta.setView('Main')}
                            onSubmit={(p) => actions.handleCreateBlocker(p)}
                        />
                    )}

                    {meta.view === 'Reassign' && (
                        <ReassignView
                            task={task}
                            team={meta.team}
                            submitting={meta.submitting}
                            onCancel={() => meta.setView('Main')}
                            onReassign={(id) => actions.handleReassign(id)}
                            onAction={(a) => actions.handleAction(a)}
                        />
                    )}

                    {meta.view === 'RequestChange' && (
                        <StrategicRequestView
                            currentValue={meta.requestedField === 'fechaObjetivo' ? form.fechaObjetivo : form.fechaInicioPlanificada}
                            submitting={meta.submitting}
                            onCancel={() => meta.setView('Main')}
                            onSubmit={(val, reason) => actions.handleSubmitStrategicChange(meta.requestedField, val, reason)}
                        />
                    )}

                    {meta.view === 'Main' && (
                        <div className="space-y-8 animate-in slide-in-from-right-2 duration-200 pb-10">

                            {/* 1. SECCIÓN DE PLANIFICACIÓN (FECHAS) - PRIMERO */}
                            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        Planificación y Fechas
                                    </h4>
                                    {isLocked && <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">🔒 Estratégico</span>}
                                </div>
                                <TaskPlanningPanel
                                    task={task}
                                    fechaInicioPlanificada={form.fechaInicioPlanificada}
                                    setFechaInicioPlanificada={form.setFechaInicioPlanificada}
                                    fechaObjetivo={form.fechaObjetivo}
                                    setFechaObjetivo={form.setFechaObjetivo}
                                    isLocked={isLocked}
                                    onRequestChange={(f) => {
                                        meta.setRequestedField(f);
                                        meta.setView('RequestChange');
                                    }}
                                />
                            </div>

                            {/* 2. SECCIÓN DE EJECUCIÓN (NOTAS/AVANCE/COMENTARIO) */}
                            <TaskExecutionPanel
                                task={meta.fullTask || task}
                                descripcion={form.descripcion}
                                setDescripcion={form.setDescripcion}
                                linkEvidencia={form.linkEvidencia}
                                setLinkEvidencia={form.setLinkEvidencia}
                                progreso={form.progreso}
                                setProgreso={form.setProgreso}
                                comentario={form.comentario}
                                setComentario={form.setComentario}
                                onDeleteComment={actions.deleteComment}
                            />

                            {/* 3. HISTORIAL OCULTO POR SOLICITUD */}

                            {/* PARTICIPANTES DE LA TAREA */}
                            <TaskParticipantsPanel
                                task={meta.fullTask || task}
                                onUpdate={onUpdate}
                            />

                            {/* RECORDATORIO */}
                            <TaskReminderPanel task={meta.fullTask || task} />

                            {/* 4. ACCIONES DE GESTIÓN (AL FONDO) */}
                            <div className="bg-slate-50/30 p-4 rounded-2xl border border-dashed border-slate-200 mt-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Acciones de Gestión</h4>
                                {!disableEdit && (
                                    <TaskManagementActions
                                        onReportBlock={() => meta.setView('Block')}
                                        onReassign={() => meta.setView('Reassign')}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTÓN GUARDAR FIJO EN EL FOOTER - ESTILO PREMIUM */}
                {meta.view === 'Main' && !disableEdit && (
                    <div className="p-4 bg-slate-50 border-t flex justify-center items-center shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] selection:bg-none">
                        <button
                            onClick={actions.handleSaveProgress}
                            disabled={meta.submitting}
                            className="bg-clarity-primary text-white px-16 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-clarity-primary/30 hover:bg-rose-700 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center gap-3 min-w-[280px] justify-center"
                        >
                            {meta.submitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            {meta.submitting ? 'Guardando...' : 'Guardar y Finalizar'}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
