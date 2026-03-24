import React, { useState } from 'react';
import { AgendaSemanal } from '../components/AgendaSemanal';
import { AgendaMensual } from '../components/AgendaMensual';
import { QuickTaskModal } from '../components/QuickTaskModal';
import { Calendar, LayoutGrid, Plus } from 'lucide-react';
import type { Tarea } from '../../../types/modelos';
import { TaskDetailModalV2 } from '../../../components/task-detail-v2/TaskDetailModalV2';

export const CalendarView: React.FC = () => {
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);
    const [showQuickTask, setShowQuickTask] = useState(false);
    const [quickTaskDefaultDate, setQuickTaskDefaultDate] = useState<string | undefined>();
    const [refreshKey, setRefreshKey] = useState(0);

    const handleTaskCreated = () => {
        setRefreshKey(k => k + 1);
    };

    return (
        <div className="h-full flex flex-col animate-fade-in overflow-hidden p-4 gap-4">
            {/* Header Bar */}
            <div className="flex items-center justify-between">
                {/* Create Task Button */}
                <button
                    onClick={() => {
                        setQuickTaskDefaultDate(undefined);
                        setShowQuickTask(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-amber-200 hover:shadow-amber-300 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={16} strokeWidth={3} />
                    Nueva Tarea Operativa
                </button>

                {/* View Selector */}
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex gap-1">
                    <button
                        onClick={() => setViewMode('week')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'week'
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <LayoutGrid size={16} />
                        Semana
                    </button>
                    <button
                        onClick={() => setViewMode('month')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'month'
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <Calendar size={16} />
                        Mes
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto" key={refreshKey}>
                {viewMode === 'week' ? (
                    <AgendaSemanal
                        onAddQuickTask={(date) => {
                            setQuickTaskDefaultDate(date.toISOString().split('T')[0]);
                            setShowQuickTask(true);
                        }}
                    />
                ) : (
                    <AgendaMensual
                        onSelectTask={(t) => setSelectedTask(t)}
                        onAddQuickTask={(date) => {
                            setQuickTaskDefaultDate(date.toISOString().split('T')[0]);
                            setShowQuickTask(true);
                        }}
                    />
                )}
            </div>

            {selectedTask && (
                <TaskDetailModalV2
                    task={selectedTask}
                    mode="execution"
                    onClose={() => setSelectedTask(null)}
                    onUpdate={() => {
                        setSelectedTask(null);
                        handleTaskCreated();
                    }}
                />
            )}

            {/* Quick Task Modal */}
            <QuickTaskModal
                isOpen={showQuickTask}
                defaultDate={quickTaskDefaultDate}
                onClose={() => setShowQuickTask(false)}
                onCreated={handleTaskCreated}
            />
        </div>
    );
};
