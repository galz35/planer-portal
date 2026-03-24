import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Folder, ArrowRight, Sparkles, CheckCircle2, ListTodo, X } from 'lucide-react';
import { clarityService } from '../../services/clarity.service';
import { alerts } from '../../utils/alerts';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { Proyecto } from '../../types/modelos';

interface Note {
    id: string;
    title: string;
    content: string;
    date: string;
    projectId?: number;
    projectName?: string;
    status: 'draft' | 'saved';
}

interface DetectedTask {
    originalText: string;
    cleanedText: string;
    index: number;
    created: boolean;
}

export const MeetingNotesPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();

    // Data State
    const [notes, setNotes] = useState<Note[]>([]);
    const [projects, setProjects] = useState<Proyecto[]>([]);

    // Editor State
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
    const [isSaving, setIsSaving] = useState(false);

    // AI/Task State
    const [detectedTasks, setDetectedTasks] = useState<DetectedTask[]>([]);
    const [showTaskPanel, setShowTaskPanel] = useState(true);

    const loadNotes = async () => {
        try {
            const res = await clarityService.getNotes();
            // Map API response to local Note interface
            const mapped = (res as any || []).map((n: any) => ({
                id: n.id,
                title: n.title,
                content: n.content,
                date: n.date,
                status: 'saved',
                projectId: n.projectId
            }));
            setNotes(mapped);
        } catch (e) {
            console.error('Error loading notes:', e);
            showToast('Error cargando notas', 'error');
        }
    };

    useEffect(() => {
        loadData();
        loadNotes();
    }, []);

    // Detect tasks on content change
    useEffect(() => {
        if (!content) {
            setDetectedTasks([]);
            return;
        }

        const lines = content.split('\n');
        const tasks: DetectedTask[] = [];

        lines.forEach((line, idx) => {
            // Patrones: "- [ ]", "[]", "TODO:", "Task:", "* [ ]"
            const todoRegex = /^(\s*[-*]\s*\[\s*\]|\s*\[\s*\]|\s*TODO:|\s*TASK:)(.*)/i;
            const match = line.match(todoRegex);

            if (match && match[2].trim().length > 0) {
                tasks.push({
                    originalText: line,
                    cleanedText: match[2].trim(),
                    index: idx,
                    created: line.includes('✅') // Ya procesada
                });
            }
        });
        setDetectedTasks(tasks);
    }, [content]);

    const loadData = async () => {
        try {
            const res = await clarityService.getProyectos();
            setProjects(res?.items || []);
        } catch (e) {
            console.warn('Error cargando proyectos', e);
        }
    };

    const handleCreateNote = () => {
        const newId = Date.now().toString();
        const newNote: Note = {
            id: newId,
            title: '',
            content: '',
            date: new Date().toISOString(),
            status: 'draft'
        };
        setNotes([newNote, ...notes]);
        setActiveNoteId(newId);
        setTitle('');
        setContent('');
        setSelectedProjectId('');
    };

    const handleSelectNote = (note: Note) => {
        setActiveNoteId(note.id);
        setTitle(note.title);
        setContent(note.content);
        setSelectedProjectId(note.projectId || '');
    };

    const handleSaveNote = async () => {
        if (!activeNoteId) return;

        setIsSaving(true);
        try {
            // const currentNote = notes.find(n => n.id === activeNoteId);
            // Simple heuristic to check if ID is temporary (timestamp based usually large)
            const isTempId = activeNoteId.length > 8;

            if (isTempId) {
                // CREATE
                await clarityService.createNote({ title, content });
                showToast('Nota creada exitosamente', 'success');
            } else {
                // UPDATE
                await clarityService.updateNote(activeNoteId, { title, content });
                showToast('Nota actualizada', 'success');
            }

            await loadNotes(); // Reload to get Real IDs and updated list
        } catch (e) {
            console.error(e);
            showToast('Error guardando nota', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteNote = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (await alerts.confirm('¿Eliminar nota?', '¿Seguro que deseas eliminar esta nota permanentemente?')) {
            try {
                await clarityService.deleteNote(id);
                const updated = notes.filter(n => n.id !== id);
                setNotes(updated);

                if (activeNoteId === id) {
                    setActiveNoteId(null);
                    setTitle('');
                    setContent('');
                }
                showToast('Nota eliminada', 'success');
            } catch (e) {
                showToast('Error eliminando nota', 'error');
            }
        }
    };

    const convertToTask = async (taskItem: DetectedTask) => {
        if (!user || taskItem.created) return;

        setIsSaving(true);
        try {
            // 1. Crear Tarea en Backend
            await clarityService.postTareaRapida({
                titulo: taskItem.cleanedText,
                idUsuario: user.idUsuario,
                idProyecto: typeof selectedProjectId === 'number' ? selectedProjectId : undefined,
                prioridad: 'Media',
                esfuerzo: 'M'
            });

            // 2. Actualizar contenido de la nota (marcar como hecho)
            const lines = content.split('\n');
            if (lines[taskItem.index]) {
                lines[taskItem.index] = '✅ ' + taskItem.cleanedText;
                const newContent = lines.join('\n');
                setContent(newContent);

                // Update note backend if saved
                if (activeNoteId && activeNoteId.length < 9) {
                    await clarityService.updateNote(activeNoteId, { title: title, content: newContent });
                }
            }

            showToast('Tarea creada exitosamente', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error creando tarea', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden font-sans">
            {/* 1. Sidebar: Lista de Notas */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-bold text-slate-700">Mis Notas</h2>
                    <button
                        onClick={handleCreateNote}
                        className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {notes.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-8">No hay notas recientes</p>
                    )}
                    {notes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => handleSelectNote(note)}
                            className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${activeNoteId === note.id
                                ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                                }`}
                        >
                            <h3 className={`text-sm font-bold mb-1 truncate pr-6 ${activeNoteId === note.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                                {note.title || 'Nueva Nota sin título'}
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>{new Date(note.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                {note.projectName && (
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 truncate max-w-[80px]">
                                        {note.projectName}
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={(e) => handleDeleteNote(e, note.id)}
                                className="absolute right-2 top-2 p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Main Editor */}
            {activeNoteId ? (
                <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 bg-white ${showTaskPanel ? 'mr-0' : ''}`}>
                    {/* Toolbar */}
                    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
                        <div className="flex items-center gap-4 flex-1">
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Título de la reunión o nota..."
                                className="text-xl font-bold bg-transparent border-none focus:ring-0 outline-none placeholder-slate-300 w-full"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={selectedProjectId}
                                onChange={e => setSelectedProjectId(Number(e.target.value))}
                                className="text-xs font-medium bg-slate-50 border-none rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-indigo-200 outline-none cursor-pointer"
                            >
                                <option value="">Sin Proyecto</option>
                                {projects.map(p => (
                                    <option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>
                                ))}
                            </select>

                            <div className="h-4 w-px bg-slate-200 mx-1" />

                            <button
                                onClick={handleSaveNote}
                                className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <Save size={16} /> <span className="hidden sm:inline">Guardar</span>
                            </button>

                            <button
                                onClick={() => setShowTaskPanel(!showTaskPanel)}
                                className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${showTaskPanel
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'
                                    }`}
                            >
                                <ListTodo size={16} />
                                <span className="hidden sm:inline">Tareas ({detectedTasks.filter(t => !t.created).length})</span>
                            </button>
                        </div>
                    </div>

                    {/* TextArea */}
                    <div className="flex-1 overflow-hidden relative">
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder={`Escribe aquí tus notas...\n\nUsa formatos como:\n- [ ] Tarea importante\nTODO: Revisar presupuesto\n[] Contactar cliente`}
                            className="w-full h-full p-8 resize-none border-none focus:ring-0 outline-none text-slate-700 leading-relaxed font-mono text-sm"
                        />
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/50">
                    <Folder size={64} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium text-slate-400">Selecciona o crea una nota para comenzar</p>
                </div>
            )}

            {/* 3. Task Extraction Panel */}
            {activeNoteId && showTaskPanel && (
                <div className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                            <Sparkles size={16} className="text-amber-500" />
                            Tareas Detectadas
                        </h3>
                        <button onClick={() => setShowTaskPanel(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {detectedTasks.length === 0 ? (
                            <div className="text-center py-10 opacity-60">
                                <ListTodo size={32} className="mx-auto mb-2 text-slate-300" />
                                <p className="text-xs text-slate-400 px-4">
                                    Escribe líneas comenzando con <strong>- [ ]</strong>, <strong>[]</strong> o <strong>TODO:</strong> para detectar tareas automáticamente.
                                </p>
                            </div>
                        ) : (
                            detectedTasks.map((task, i) => (
                                <div key={i} className={`bg-white p-3 rounded-xl border shadow-sm transition-all ${task.created ? 'border-emerald-100 opacity-75' : 'border-indigo-100 hover:border-indigo-300 hover:shadow-md'
                                    }`}>
                                    <div className="flex items-start gap-2 mb-2">
                                        <div className={`mt-0.5 shrink-0 ${task.created ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                            {task.created ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded border-2 border-indigo-200" />}
                                        </div>
                                        <p className={`text-xs ${task.created ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                                            {task.cleanedText}
                                        </p>
                                    </div>

                                    {!task.created && (
                                        <div className="flex justify-end pt-2 border-t border-slate-50">
                                            <button
                                                onClick={() => convertToTask(task)}
                                                disabled={isSaving}
                                                className="flex items-center gap-1.5 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                            >
                                                Crear Tarea <ArrowRight size={10} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
