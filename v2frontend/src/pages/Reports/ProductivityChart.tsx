
import React from 'react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProductivityData {
    date: string;
    count: number;
}

interface ProductivityChartProps {
    data: ProductivityData[];
}

export const ProductivityChart: React.FC<ProductivityChartProps> = ({ data }) => {
    // Asegurar que las fechas son legibles y agrupar si es necesario
    const chartData = data.map((item) => ({
        ...item,
        formattedDate: format(parseISO(item.date), 'dd MMM', { locale: es }),
        count: Number(item.count),
    }));

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in zoom-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Rendimiento del Equipo</h3>
                    <p className="text-sm text-slate-500">Tareas completadas en los últimos 14 días</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                        <span className="text-xs font-semibold text-slate-600">Completadas</span>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="formattedDate"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}
                            cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#6366f1"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorCount)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Periodo</span>
                    <span className="text-2xl font-black text-slate-800">
                        {chartData.reduce((acc, curr) => acc + curr.count, 0)}
                    </span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                    <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Promedio Diario</span>
                    <span className="text-2xl font-black text-emerald-700">
                        {(chartData.reduce((acc, curr) => acc + curr.count, 0) / (chartData.length || 1)).toFixed(1)}
                    </span>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center">
                    <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Pico Máximo</span>
                    <span className="text-2xl font-black text-indigo-700">
                        {Math.max(...chartData.map(d => d.count), 0)}
                    </span>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center">
                    <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Días Medidos</span>
                    <span className="text-2xl font-black text-amber-700">
                        {chartData.length}
                    </span>
                </div>
            </div>
        </div>
    );
};
