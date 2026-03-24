import React from 'react';
import { useMiDiaContext } from '../context/MiDiaContext';
import { DashboardEjecutivo } from '../components/DashboardEjecutivo';

export const ExecutiveView: React.FC = () => {
    const { userId } = useMiDiaContext();
    return (
        <div className="h-full animate-fade-in overflow-auto">
            <DashboardEjecutivo userId={userId} />
        </div>
    );
};
