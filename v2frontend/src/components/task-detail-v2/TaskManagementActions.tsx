import React from 'react';
import { AlertTriangle, UserPlus } from 'lucide-react';

interface Props {
    onReportBlock: () => void;
    onReassign: () => void;
}

export const TaskManagementActions: React.FC<Props> = ({ onReportBlock, onReassign }) => {
    return (
        <div className="flex justify-between items-center pt-6 gap-3 border-t border-slate-50">
            <button
                onClick={onReportBlock}
                className="flex-1 py-2.5 px-4 bg-rose-50 text-rose-700 rounded-xl font-bold text-xs hover:bg-rose-100 flex items-center justify-center gap-2 transition-colors border border-rose-100"
            >
                <AlertTriangle size={14} /> Reportar Bloqueo
            </button>

            <button
                onClick={onReassign}
                className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 flex items-center justify-center gap-2 transition-colors border border-slate-200"
            >
                <UserPlus size={14} /> Reasignar Tarea
            </button>
        </div>
    );
};
