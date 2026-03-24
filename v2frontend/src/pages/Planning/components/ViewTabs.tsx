import React from 'react';
import { List, Layout } from 'lucide-react';
import type { ViewMode } from '../../../types/plan-trabajo.types';

export const ViewTabs: React.FC<{ value: ViewMode; onChange: (v: ViewMode) => void }> = ({ value, onChange }) => {
    const btn = (k: ViewMode, Icon: any, title: string) => (
        <button
            type="button"
            onClick={() => onChange(k)}
            title={title}
            className={`p-2 rounded-lg transition-all ${value === k
                ? "bg-white shadow-sm text-slate-900 scale-105 border border-slate-200"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
        >
            <Icon size={18} />
        </button>
    );

    return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner gap-1">
            {btn("integral", Layout, "Gantt")}
            {btn("list", List, "Lista Detallada")}
        </div>
    );
};
