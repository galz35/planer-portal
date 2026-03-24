import { useEffect, useState } from 'react';
import { clarityService } from '../../services/clarity.service';
import {
    Calendar, CheckCircle, AlertCircle, Users, Clock,
    ChevronDown, Zap, AlertTriangle, ShieldCheck, XCircle,
    RefreshCw, Smile, Meh, Frown, BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ComplianceItem {
    usuario: {
        idUsuario: number;
        nombre: string;
        correo: string;
        carnet: string;
        area: string;
        rol: { nombre: string };
    };
    checkin: {
        idCheckin: number;
        fecha: string;
        estadoAnimo: string;
        nota: string;
        entregableTexto: string;
    } | null;
    estadisticas: {
        hoy: number;
        hechas: number;
        retrasadas: number;
        enCurso: number;
        bloqueadas: number;
        descartadas: number;
    };
}

interface ResumenAnimo {
    feliz: number;
    neutral: number;
    triste: number;
    promedio: number;
}

const MoodIcon = ({ mood, size = 16 }: { mood: string; size?: number }) => {
    if (mood === 'Tope' || mood === 'Bien') return <Smile size={size} className="text-emerald-500" />;
    if (mood === 'Bajo') return <Frown size={size} className="text-rose-500" />;
    return <Meh size={size} className="text-amber-500" />;
};

const MoodLabel = ({ mood }: { mood: string }) => {
    const map: Record<string, { label: string; color: string }> = {
        'Tope': { label: 'Excelente', color: 'bg-emerald-100 text-emerald-700' },
        'Bien': { label: 'Bien', color: 'bg-emerald-50 text-emerald-600' },
        'Ok': { label: 'Normal', color: 'bg-slate-100 text-slate-600' },
        'Neutral': { label: 'Normal', color: 'bg-slate-100 text-slate-600' },
        'Bajo': { label: 'Bajo', color: 'bg-rose-50 text-rose-600' },
    };
    const m = map[mood] || map['Ok'];
    return <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${m.color}`}>{m.label}</span>;
};

// Circular progress ring
const ComplianceRing = ({ rate, size = 120 }: { rate: number; size?: number }) => {
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (rate / 100) * circumference;
    const color = rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444';

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-800">{rate}%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cumple</span>
            </div>
        </div>
    );
};

// Stat badge for user row
const StatBadge = ({ icon: Icon, value, color, label }: {
    icon: any; value: number; color: string; label: string;
}) => {
    if (value === 0) return null;
    return (
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${color}`}
            title={label}>
            <Icon size={10} />
            <span>{value}</span>
        </div>
    );
};

export const AgendaCompliancePage = () => {
    const [date, setDate] = useState(new Date());
    const [items, setItems] = useState<ComplianceItem[]>([]);
    const [resumenAnimo, setResumenAnimo] = useState<ResumenAnimo>({ feliz: 0, neutral: 0, triste: 0, promedio: 0 });
    const [loading, setLoading] = useState(true);
    const [expandedAreas, setExpandedAreas] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'compliant' | 'missing'>('compliant');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await clarityService.getAgendaCompliance(date.toISOString()) as any;
            const cleanItems = (data.miembros || []).filter((m: any) => {
                const name = (m.usuario.nombre || '').toLowerCase();
                return !name.includes('test') && !name.includes('prueba');
            });
            setItems(cleanItems);
            setResumenAnimo(data.resumenAnimo || { feliz: 0, neutral: 0, triste: 0, promedio: 0 });
            const areas = cleanItems.map((i: any) => i.usuario.area || 'Sin Subgerencia');
            setExpandedAreas(Array.from(new Set(areas)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [date]);

    const total = items.length;
    const compliantItems = items.filter(i => i.checkin);
    const missingItems = items.filter(i => !i.checkin);
    const compliant = compliantItems.length;
    const missing = total - compliant;
    const rate = total > 0 ? Math.round((compliant / total) * 100) : 0;

    // Estadísticas globales agregadas
    const globalStats = items.reduce((acc, item) => ({
        retrasadas: acc.retrasadas + (item.estadisticas?.retrasadas || 0),
        hechas: acc.hechas + (item.estadisticas?.hechas || 0),
        enCurso: acc.enCurso + (item.estadisticas?.enCurso || 0),
        bloqueadas: acc.bloqueadas + (item.estadisticas?.bloqueadas || 0),
    }), { retrasadas: 0, hechas: 0, enCurso: 0, bloqueadas: 0 });

    const groupBySubgerencia = (list: ComplianceItem[]) => {
        return list.reduce((acc, item) => {
            const area = item.usuario.area || 'Sin Subgerencia';
            if (!acc[area]) acc[area] = [];
            acc[area].push(item);
            return acc;
        }, {} as Record<string, ComplianceItem[]>);
    };

    const toggleArea = (area: string) => {
        setExpandedAreas(prev =>
            prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
        );
    };

    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

    const activeList = activeTab === 'compliant' ? compliantItems : missingItems;
    const grouped = groupBySubgerencia(activeList);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8fafc]">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-slate-500 font-semibold text-sm">Cargando reporte de seguimiento...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

                {/* ━━━━━ HEADER ━━━━━ */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                            <BarChart3 className="text-indigo-600 w-7 h-7" />
                            Seguimiento de Agenda
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Cumplimiento de planificación diaria del equipo
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isToday && (
                            <button onClick={() => setDate(new Date())}
                                className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors">
                                Hoy
                            </button>
                        )}
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={format(date, 'yyyy-MM-dd')}
                                onChange={(e) => setDate(new Date(e.target.value))}
                                className="text-sm border-none focus:ring-0 text-slate-700 outline-none bg-transparent font-semibold"
                            />
                        </div>
                        <button onClick={loadData}
                            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors shadow-sm">
                            <RefreshCw size={16} />
                        </button>
                        <button
                            onClick={() => {
                                const headers = ['Miembro', 'Carnet', 'Rol', 'Area', 'Check-in', 'Animo', 'Hechas', 'En Curso', 'Atrasadas', 'Bloqueadas'];
                                const rows = items.map(item => [
                                    item.usuario.nombre,
                                    item.usuario.carnet,
                                    item.usuario.rol.nombre,
                                    item.usuario.area,
                                    item.checkin ? format(new Date(item.checkin.fecha), 'HH:mm') : 'Sin Agenda',
                                    item.checkin?.estadoAnimo || 'N/A',
                                    item.estadisticas?.hechas || 0,
                                    item.estadisticas?.enCurso || 0,
                                    item.estadisticas?.retrasadas || 0,
                                    item.estadisticas?.bloqueadas || 0
                                ]);

                                const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.setAttribute("href", url);
                                link.setAttribute("download", `Seguimiento_Agenda_${format(date, 'yyyy-MM-dd')}.csv`);
                                document.body.appendChild(link);
                                link.click();
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        >
                            <BarChart3 size={16} /> Exportar CSV
                        </button>
                    </div>
                </header>

                {/* ━━━━━ HERO DASHBOARD ━━━━━ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Compliance Ring Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-6 lg:col-span-1">
                        <ComplianceRing rate={rate} />
                        <div className="flex-1 space-y-3">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {format(date, "EEEE d 'de' MMMM", { locale: es })}
                                </div>
                                <div className="text-lg font-black text-slate-800 mt-0.5">
                                    {compliant} de {total} miembros
                                </div>
                            </div>
                            {/* Mini progress bar */}
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: `${rate}%`,
                                        backgroundColor: rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444'
                                    }} />
                            </div>
                            <div className="flex gap-4 text-xs">
                                <div className="flex items-center gap-1 text-emerald-600 font-bold">
                                    <CheckCircle size={12} /> {compliant} con agenda
                                </div>
                                <div className="flex items-center gap-1 text-slate-400 font-bold">
                                    <AlertCircle size={12} /> {missing} sin agenda
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 lg:col-span-1">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hechas</span>
                                <CheckCircle size={14} className="text-emerald-500" />
                            </div>
                            <span className="text-2xl font-black text-emerald-600">{globalStats.hechas}</span>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">En Curso</span>
                                <Zap size={14} className="text-blue-500" />
                            </div>
                            <span className="text-2xl font-black text-blue-600">{globalStats.enCurso}</span>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Atrasadas</span>
                                <AlertTriangle size={14} className="text-rose-500" />
                            </div>
                            <span className={`text-2xl font-black ${globalStats.retrasadas > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                {globalStats.retrasadas}
                            </span>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bloqueadas</span>
                                <XCircle size={14} className="text-amber-500" />
                            </div>
                            <span className={`text-2xl font-black ${globalStats.bloqueadas > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                                {globalStats.bloqueadas}
                            </span>
                        </div>
                    </div>

                    {/* Mood Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:col-span-1">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Smile size={14} className="text-amber-500" />
                            Estado de Ánimo del Equipo
                        </div>
                        <div className="flex items-end gap-6 h-20">
                            {/* Feliz */}
                            <div className="flex flex-col items-center gap-1 flex-1">
                                <div className="w-full bg-emerald-100 rounded-t-lg relative flex items-end justify-center overflow-hidden"
                                    style={{ height: Math.max(8, (resumenAnimo.feliz / Math.max(total, 1)) * 80) }}>
                                    <span className="text-[10px] font-black text-emerald-700 py-0.5">
                                        {resumenAnimo.feliz}
                                    </span>
                                </div>
                                <Smile size={16} className="text-emerald-500" />
                                <span className="text-[9px] font-bold text-slate-400">Bien</span>
                            </div>
                            {/* Neutral */}
                            <div className="flex flex-col items-center gap-1 flex-1">
                                <div className="w-full bg-amber-100 rounded-t-lg relative flex items-end justify-center overflow-hidden"
                                    style={{ height: Math.max(8, (resumenAnimo.neutral / Math.max(total, 1)) * 80) }}>
                                    <span className="text-[10px] font-black text-amber-700 py-0.5">
                                        {resumenAnimo.neutral}
                                    </span>
                                </div>
                                <Meh size={16} className="text-amber-500" />
                                <span className="text-[9px] font-bold text-slate-400">Normal</span>
                            </div>
                            {/* Triste */}
                            <div className="flex flex-col items-center gap-1 flex-1">
                                <div className="w-full bg-rose-100 rounded-t-lg relative flex items-end justify-center overflow-hidden"
                                    style={{ height: Math.max(8, (resumenAnimo.triste / Math.max(total, 1)) * 80) }}>
                                    <span className="text-[10px] font-black text-rose-700 py-0.5">
                                        {resumenAnimo.triste}
                                    </span>
                                </div>
                                <Frown size={16} className="text-rose-500" />
                                <span className="text-[9px] font-bold text-slate-400">Bajo</span>
                            </div>
                            {/* Sin dato */}
                            <div className="flex flex-col items-center gap-1 flex-1">
                                {(() => {
                                    const sinDato = total - resumenAnimo.feliz - resumenAnimo.neutral - resumenAnimo.triste;
                                    return (
                                        <>
                                            <div className="w-full bg-slate-100 rounded-t-lg relative flex items-end justify-center overflow-hidden"
                                                style={{ height: Math.max(8, (sinDato / Math.max(total, 1)) * 80) }}>
                                                <span className="text-[10px] font-black text-slate-500 py-0.5">
                                                    {sinDato}
                                                </span>
                                            </div>
                                            <Users size={16} className="text-slate-400" />
                                            <span className="text-[9px] font-bold text-slate-400">N/A</span>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ━━━━━ TAB SELECTOR ━━━━━ */}
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 w-fit">
                    <button
                        onClick={() => setActiveTab('compliant')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'compliant'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <ShieldCheck size={16} />
                        Con Agenda
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'compliant' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                            {compliant}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('missing')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'missing'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <AlertCircle size={16} />
                        Sin Agenda
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'missing' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'}`}>
                            {missing}
                        </span>
                    </button>
                </div>

                {/* ━━━━━ GROUPED LIST ━━━━━ */}
                <div className="space-y-4 pb-20">
                    {Object.keys(grouped).length === 0 && (
                        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                {activeTab === 'compliant'
                                    ? <AlertCircle className="w-8 h-8 text-slate-300" />
                                    : <CheckCircle className="w-8 h-8 text-emerald-300" />
                                }
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">
                                {activeTab === 'compliant' ? 'Nadie ha registrado agenda hoy' : '¡Todos tienen agenda! 🎉'}
                            </h3>
                            <p className="text-slate-400 text-sm mt-1">
                                {activeTab === 'compliant' ? 'Puede que sea un día sin actividad laboral.' : 'El equipo completo hizo su planificación.'}
                            </p>
                        </div>
                    )}

                    {Object.entries(grouped).sort().map(([area, members]) => {
                        const isExpanded = expandedAreas.includes(area);
                        const areaColor = activeTab === 'compliant' ? 'emerald' : 'rose';

                        return (
                            <div key={`${activeTab}-${area}`}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">

                                {/* Area Header */}
                                <div
                                    className="px-5 py-3.5 flex justify-between items-center cursor-pointer hover:bg-slate-50/80 transition-colors"
                                    onClick={() => toggleArea(area)}
                                >
                                    <div className="flex items-center gap-3">
                                        <ChevronDown size={16}
                                            className={`text-slate-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                                        <div>
                                            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                                {area}
                                            </span>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                {members.length} miembro{members.length > 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg bg-${areaColor}-50 text-${areaColor}-600`}>
                                        {members.length}
                                    </span>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100">
                                        <table className="w-full text-sm text-left">
                                            <thead>
                                                <tr className="bg-slate-50/50">
                                                    <th className="px-5 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Miembro</th>
                                                    {activeTab === 'compliant' && (
                                                        <>
                                                            <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Ánimo</th>
                                                            <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Estadísticas</th>
                                                        </>
                                                    )}
                                                    <th className="px-5 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                                                        {activeTab === 'compliant' ? 'Check-in' : 'Estado'}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {members.map(item => (
                                                    <tr key={item.usuario.idUsuario}
                                                        className={`hover:${activeTab === 'compliant' ? 'bg-emerald-50/20' : 'bg-rose-50/20'} transition-colors group`}>

                                                        {/* Name + Role */}
                                                        <td className="px-5 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[10px] ${activeTab === 'compliant'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-rose-100 text-rose-700'
                                                                    }`}>
                                                                    {(item.usuario.nombre || '??').substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-700 text-xs group-hover:text-slate-900 transition-colors">
                                                                        {item.usuario.nombre}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 leading-tight">
                                                                        {item.usuario.rol.nombre}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {activeTab === 'compliant' && (
                                                            <>
                                                                {/* Mood */}
                                                                <td className="px-3 py-3 hidden md:table-cell">
                                                                    {item.checkin?.estadoAnimo ? (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <MoodIcon mood={item.checkin.estadoAnimo} />
                                                                            <MoodLabel mood={item.checkin.estadoAnimo} />
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-300 text-[10px]">—</span>
                                                                    )}
                                                                </td>

                                                                {/* Stats Badges */}
                                                                <td className="px-3 py-3 hidden md:table-cell">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        <StatBadge icon={CheckCircle} value={item.estadisticas?.hechas || 0}
                                                                            color="bg-emerald-50 text-emerald-600" label="Hechas" />
                                                                        <StatBadge icon={Zap} value={item.estadisticas?.enCurso || 0}
                                                                            color="bg-blue-50 text-blue-600" label="En curso" />
                                                                        <StatBadge icon={AlertTriangle} value={item.estadisticas?.retrasadas || 0}
                                                                            color="bg-rose-50 text-rose-600" label="Atrasadas" />
                                                                        <StatBadge icon={XCircle} value={item.estadisticas?.bloqueadas || 0}
                                                                            color="bg-amber-50 text-amber-600" label="Bloqueadas" />
                                                                    </div>
                                                                </td>
                                                            </>
                                                        )}

                                                        {/* Time / Status */}
                                                        <td className="px-5 py-3 text-right">
                                                            {activeTab === 'compliant' ? (
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <Clock size={12} className="text-emerald-400" />
                                                                    <span className="font-mono text-emerald-600 font-bold text-xs">
                                                                        {item.checkin ? format(new Date(item.checkin.fecha), 'HH:mm') : '-'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                                    Pendiente
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
