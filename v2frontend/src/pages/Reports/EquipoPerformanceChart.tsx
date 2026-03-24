import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface Props {
    data: {
        nombre: string,
        total: number,
        hechas: number,
        atrasadas: number,
        enCurso: number,
        porcentaje: number
    }[];
}

export const EquipoPerformanceChart: React.FC<Props> = ({ data }) => {
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in zoom-in duration-500">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Desempeño Comparativo (Estado de Tareas)</h3>
            <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 40, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" />
                        <YAxis
                            dataKey="nombre"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                            width={100}
                        />
                        <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="hechas" name="Completadas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={25} />
                        <Bar dataKey="enCurso" name="En Curso" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={25} />
                        <Bar dataKey="atrasadas" name="Atrasadas" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={25} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-center font-bold">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 italic">"Hechas": Logros reales en el periodo</div>
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 italic">"En Curso": Trabajo activo actualmente</div>
                <div className="p-2 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 italic">"Atrasadas": Meta vencida sin completar</div>
            </div>
        </div>
    );
};
