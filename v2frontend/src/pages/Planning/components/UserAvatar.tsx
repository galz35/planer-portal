import React from 'react';

export const UserAvatar: React.FC<{ name: string, color?: string }> = ({ name, color }) => (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${color || 'bg-slate-600'}`}>
        {(name || '?').charAt(0).toUpperCase()}
    </div>
);
