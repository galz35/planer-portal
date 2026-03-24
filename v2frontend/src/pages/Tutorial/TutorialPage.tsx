import React, { useState } from 'react';
import {
    BookOpen, CheckCircle, ChevronRight, ChevronLeft, Activity, ShieldAlert,
    Layers, Users, Target, Calendar, BarChart3, Zap, Clock,
    MessageSquare, ArrowRight, Lightbulb, AlertTriangle, CheckSquare,
    TrendingUp, Settings, Filter, Download, Eye, Edit3, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Lesson {
    title: string;
    duration: string;
    content: React.ReactNode;
}

interface TutorialModule {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    gradient: string;
    lessons: Lesson[];
}

const TUTORIAL_MODULES: TutorialModule[] = [
    {
        id: 'intro',
        title: 'Primeros Pasos',
        description: 'Qué es Planner-EF y cómo empezar',
        icon: <BookOpen />,
        color: 'bg-blue-500',
        gradient: 'from-blue-500 to-cyan-500',
        lessons: [
            {
                title: '¿Qué es Planner-EF?',
                duration: '3 min',
                content: (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                            <h4 className="font-bold text-blue-800 text-lg mb-3">En palabras simples:</h4>
                            <p className="text-blue-700">
                                Planner-EF es una herramienta para organizar tu trabajo. Te ayuda a saber qué hacer cada día
                                y a mostrar tu avance sin necesidad de reuniones constantes.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h5 className="font-bold text-slate-700">¿Para qué sirve?</h5>
                            <div className="space-y-2">
                                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                    <Eye className="text-emerald-500 mt-0.5" size={20} />
                                    <div>
                                        <p className="font-medium text-slate-700">Ver qué es importante</p>
                                        <p className="text-sm text-slate-500">Siempre sabrás en qué enfocarte primero.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                    <Users className="text-blue-500 mt-0.5" size={20} />
                                    <div>
                                        <p className="font-medium text-slate-700">Mantener informado a tu jefe</p>
                                        <p className="text-sm text-slate-500">Sin tener que escribir reportes manuales.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                    <Target className="text-purple-500 mt-0.5" size={20} />
                                    <div>
                                        <p className="font-medium text-slate-700">Terminar lo que empiezas</p>
                                        <p className="text-sm text-slate-500">El sistema te ayuda a completar tareas, no solo a listarlas.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '¿Dónde encuentro cada cosa?',
                duration: '4 min',
                content: (
                    <div className="space-y-6">
                        <p className="text-slate-600">En el menú de la izquierda encontrarás estas secciones:</p>

                        <div className="space-y-3">
                            <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <Calendar className="text-emerald-600" size={24} />
                                <div>
                                    <h5 className="font-bold text-slate-800">Mi Día (Hoy)</h5>
                                    <p className="text-sm text-slate-600">Aquí planificas tu día y marcas lo que vas completando. Es tu página principal.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <Layers className="text-indigo-600" size={24} />
                                <div>
                                    <h5 className="font-bold text-slate-800">Planning</h5>
                                    <p className="text-sm text-slate-600">Tus proyectos y tareas a largo plazo. Puedes ver calendarios y líneas de tiempo.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                                <Users className="text-purple-600" size={24} />
                                <div>
                                    <h5 className="font-bold text-slate-800">Equipo</h5>
                                    <p className="text-sm text-slate-600">Solo para jefes: ver cómo va el equipo y ayudar con problemas.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <BarChart3 className="text-blue-600" size={24} />
                                <div>
                                    <h5 className="font-bold text-slate-800">Reportes</h5>
                                    <p className="text-sm text-slate-600">Gráficas y números sobre el trabajo realizado.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-slate-100 rounded-xl border border-slate-200">
                                <Settings className="text-slate-600" size={24} />
                                <div>
                                    <h5 className="font-bold text-slate-800">Admin</h5>
                                    <p className="text-sm text-slate-600">Configuración del sistema (solo para administradores).</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Tipos de usuarios',
                duration: '3 min',
                content: (
                    <div className="space-y-6">
                        <p className="text-slate-600">Según tu puesto, verás diferentes cosas en el sistema:</p>

                        <div className="space-y-4">
                            <div className="bg-emerald-500 p-5 rounded-2xl text-white">
                                <h4 className="font-bold text-lg mb-2">👤 Si eres Colaborador</h4>
                                <p className="text-emerald-100 text-sm mb-3">La mayoría de personas usan el sistema así:</p>
                                <ul className="space-y-1 text-emerald-50 text-sm">
                                    <li>• Planificas tu día en "Mi Día"</li>
                                    <li>• Marcas tus tareas como completadas</li>
                                    <li>• Avisas si algo te bloquea</li>
                                    <li>• Ves los proyectos donde participas</li>
                                </ul>
                            </div>

                            <div className="bg-indigo-500 p-5 rounded-2xl text-white">
                                <h4 className="font-bold text-lg mb-2">👔 Si eres Jefe o Gerente</h4>
                                <p className="text-indigo-100 text-sm mb-3">Además de lo anterior, puedes:</p>
                                <ul className="space-y-1 text-indigo-50 text-sm">
                                    <li>• Ver cómo va todo tu equipo</li>
                                    <li>• Resolver los problemas que reportan</li>
                                    <li>• Repartir trabajo entre personas</li>
                                    <li>• Ver reportes de productividad</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            }
        ]
    },
    {
        id: 'mi-dia',
        title: 'Mi Día: Lo Básico',
        description: 'Cómo usar tu página principal',
        icon: <Activity />,
        color: 'bg-emerald-500',
        gradient: 'from-emerald-500 to-teal-500',
        lessons: [
            {
                title: 'Cómo empezar tu día',
                duration: '5 min',
                content: (
                    <div className="space-y-6">
                        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                            <h4 className="font-bold text-emerald-800 mb-2">☀️ Cada mañana, haz esto:</h4>
                            <p className="text-emerald-700">Abre Planner-EF y decide qué vas a hacer hoy. Toma solo 2 minutos.</p>
                        </div>

                        <div className="space-y-4">
                            <h5 className="font-bold text-slate-700">Paso a paso:</h5>

                            <div className="flex gap-4 items-start p-4 bg-white rounded-xl border border-slate-200">
                                <div className="w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">1</div>
                                <div>
                                    <h6 className="font-bold text-slate-800">Elige tu tarea más importante</h6>
                                    <p className="text-sm text-slate-600">Piensa: "Si solo pudiera hacer UNA cosa hoy, ¿cuál sería?"</p>
                                    <div className="mt-2 bg-rose-50 p-3 rounded-lg text-sm text-rose-700">
                                        <strong>Ejemplo:</strong> "Terminar el informe para el cliente"
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start p-4 bg-white rounded-xl border border-slate-200">
                                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">3</div>
                                <div>
                                    <h6 className="font-bold text-slate-800">Agrega 3 tareas secundarias</h6>
                                    <p className="text-sm text-slate-600">Cosas que quieres avanzar, aunque no las termines hoy.</p>
                                    <div className="mt-2 bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                                        <strong>Ejemplos:</strong> Revisar correos, llamar a proveedor, leer documento
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start p-4 bg-white rounded-xl border border-slate-200">
                                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">5</div>
                                <div>
                                    <h6 className="font-bold text-slate-800">Agrega tareas cortas</h6>
                                    <p className="text-sm text-slate-600">Cosas rápidas que puedes hacer en menos de 15 minutos.</p>
                                    <div className="mt-2 bg-emerald-50 p-3 rounded-lg text-sm text-emerald-700">
                                        <strong>Ejemplos:</strong> Aprobar una solicitud, responder un mensaje
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                            <h5 className="font-bold text-amber-800 flex items-center gap-2"><Lightbulb size={18} /> ¿Por qué 1-3-5?</h5>
                            <p className="text-sm text-amber-700 mt-1">
                                9 tareas es un número realista. Si planificas 20 tareas, nunca las terminarás y te frustrarás.
                                Menos es más.
                            </p>
                        </div>
                    </div>
                )
            },
            {
                title: 'Cómo te sientes importa',
                duration: '2 min',
                content: (
                    <div className="space-y-6">
                        <p className="text-slate-600">El sistema te pregunta cómo te sientes. No es por curiosidad, es útil:</p>

                        <div className="grid gap-4">
                            <div className="bg-emerald-500 p-5 rounded-2xl text-white text-center">
                                <Zap size={32} className="mx-auto mb-2" />
                                <h5 className="font-bold text-lg">TOPE ⚡</h5>
                                <p className="text-sm text-emerald-100 mt-1">Me siento con energía, listo para retos.</p>
                            </div>
                            <div className="bg-blue-500 p-5 rounded-2xl text-white text-center">
                                <Activity size={32} className="mx-auto mb-2" />
                                <h5 className="font-bold text-lg">BIEN 🔋</h5>
                                <p className="text-sm text-blue-100 mt-1">Normal, puedo trabajar sin problemas.</p>
                            </div>
                            <div className="bg-rose-500 p-5 rounded-2xl text-white text-center">
                                <AlertTriangle size={32} className="mx-auto mb-2" />
                                <h5 className="font-bold text-lg">BAJO ⚠️</h5>
                                <p className="text-sm text-rose-100 mt-1">Cansado o con problemas externos.</p>
                            </div>
                        </div>

                        <div className="bg-slate-100 p-4 rounded-xl">
                            <h5 className="font-bold text-slate-700 mb-2">¿Para qué sirve esto?</h5>
                            <ul className="space-y-1 text-sm text-slate-600">
                                <li>• Si marcas "Bajo", tu jefe entiende que hoy no es tu mejor día</li>
                                <li>• El sistema detecta si siempre estás cansado (posible sobrecarga)</li>
                                <li>• Ayuda a que te asignen trabajo de forma justa</li>
                            </ul>
                        </div>
                    </div>
                )
            },
            {
                title: 'Cómo usar las tareas',
                duration: '5 min',
                content: (
                    <div className="space-y-6">
                        <p className="text-slate-600">Haz clic en cualquier tarea para ver todas sus opciones:</p>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Edit3 className="text-blue-500" size={20} />
                                    <h5 className="font-bold text-slate-800">Editar</h5>
                                </div>
                                <p className="text-sm text-slate-600">Cambiar el nombre, fechas o prioridad de la tarea.</p>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckSquare className="text-emerald-500" size={20} />
                                    <h5 className="font-bold text-slate-800">Lista de pasos</h5>
                                </div>
                                <p className="text-sm text-slate-600">Divide tareas grandes en pasos pequeños y márcalos uno por uno.</p>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="text-purple-500" size={20} />
                                    <h5 className="font-bold text-slate-800">Progreso</h5>
                                </div>
                                <p className="text-sm text-slate-600">Mueve la barra de 0% a 100% según avances.</p>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="text-amber-500" size={20} />
                                    <h5 className="font-bold text-slate-800">Notas (Bitácora)</h5>
                                </div>
                                <p className="text-sm text-slate-600">Escribe qué hiciste. Esto evita que te pidan reportes después.</p>
                            </div>
                        </div>

                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <h5 className="font-bold text-indigo-800 mb-2">💡 Consejo</h5>
                            <p className="text-sm text-indigo-700">
                                Escribe una nota corta cada día. Al final de la semana tendrás un registro
                                de todo lo que hiciste sin esfuerzo extra.
                            </p>
                        </div>
                    </div>
                )
            },
            {
                title: 'Cuando algo te bloquea',
                duration: '4 min',
                content: (
                    <div className="space-y-6">
                        <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200">
                            <div className="flex items-center gap-3 mb-2">
                                <ShieldAlert className="text-rose-600" size={28} />
                                <h4 className="font-bold text-rose-800 text-lg">¿Qué es un bloqueo?</h4>
                            </div>
                            <p className="text-rose-700">
                                Un bloqueo es cuando NO PUEDES avanzar porque dependes de algo o alguien más.
                                No es que no sepas cómo hacerlo, es que algo externo te lo impide.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h5 className="font-bold text-slate-700">Ejemplos de bloqueos:</h5>
                            <div className="grid md:grid-cols-2 gap-2">
                                {[
                                    'El sistema está caído',
                                    'Esperando que el jefe apruebe algo',
                                    'Necesito información de otro departamento',
                                    'El proveedor no contesta',
                                    'Falta un material o recurso',
                                    'Otra tarea tiene que terminarse primero'
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-sm">
                                        <AlertTriangle size={14} className="text-amber-500" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-800 text-white p-5 rounded-xl">
                            <h5 className="font-bold mb-3">¿Qué pasa cuando reportas un bloqueo?</h5>
                            <ol className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-white text-slate-800 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                    Tu jefe recibe un aviso inmediato
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-white text-slate-800 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                    El problema queda registrado
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-white text-slate-800 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                    Nadie te culpa si la tarea se atrasa por esto
                                </li>
                            </ol>
                        </div>

                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                            <p className="text-sm text-emerald-700">
                                <strong>Importante:</strong> No te quedes callado cuando algo te bloquea.
                                Reportarlo es la forma correcta de pedir ayuda.
                            </p>
                        </div>
                    </div>
                )
            }
        ]
    },
    {
        id: 'proyectos',
        title: 'Proyectos',
        description: 'Organizar trabajo a largo plazo',
        icon: <Layers />,
        color: 'bg-indigo-500',
        gradient: 'from-indigo-500 to-purple-500',
        lessons: [
            {
                title: 'Qué es un proyecto',
                duration: '3 min',
                content: (
                    <div className="space-y-6">
                        <p className="text-slate-600">Un proyecto es un grupo de tareas que tienen un objetivo común.</p>

                        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                            <h4 className="font-bold text-indigo-800 mb-3">Ejemplo:</h4>
                            <div className="bg-white p-4 rounded-lg border border-indigo-200">
                                <p className="font-bold text-slate-800 mb-2">📁 Proyecto: "Lanzar nueva página web"</p>
                                <ul className="text-sm text-slate-600 space-y-1">
                                    <li>• Tarea 1: Diseñar la página</li>
                                    <li>• Tarea 2: Escribir el contenido</li>
                                    <li>• Tarea 3: Programar la página</li>
                                    <li>• Tarea 4: Probar que funcione</li>
                                    <li>• Tarea 5: Publicar</li>
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h5 className="font-bold text-slate-700">Un proyecto tiene:</h5>
                            <div className="grid gap-2">
                                <div className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                    <ArrowRight className="text-indigo-500 mt-0.5" size={18} />
                                    <div>
                                        <span className="font-medium text-slate-700">Nombre claro</span>
                                        <span className="text-sm text-slate-500 ml-2">que explique de qué se trata</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                    <ArrowRight className="text-indigo-500 mt-0.5" size={18} />
                                    <div>
                                        <span className="font-medium text-slate-700">Responsable</span>
                                        <span className="text-sm text-slate-500 ml-2">la persona a cargo</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                    <ArrowRight className="text-indigo-500 mt-0.5" size={18} />
                                    <div>
                                        <span className="font-medium text-slate-700">Fecha límite</span>
                                        <span className="text-sm text-slate-500 ml-2">cuándo debe estar listo</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Ver tus tareas en calendario',
                duration: '4 min',
                content: (
                    <div className="space-y-6">
                        <p className="text-slate-600">En Planning puedes ver tus tareas de diferentes formas:</p>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-xl border border-slate-200">
                                <Calendar className="text-blue-500 mb-3" size={28} />
                                <h5 className="font-bold text-slate-800 mb-2">Timeline (Línea de tiempo)</h5>
                                <ul className="text-sm text-slate-600 space-y-1">
                                    <li>• Ver todas las tareas en el tiempo</li>
                                    <li>• Arrastrar para cambiar fechas</li>
                                    <li>• Ver qué semana está más cargada</li>
                                </ul>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200">
                                <BarChart3 className="text-purple-500 mb-3" size={28} />
                                <h5 className="font-bold text-slate-800 mb-2">Gantt</h5>
                                <ul className="text-sm text-slate-600 space-y-1">
                                    <li>• Ver qué tareas dependen de otras</li>
                                    <li>• Detectar si hay problemas de tiempo</li>
                                    <li>• Planificar mejor los proyectos grandes</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                            <h5 className="font-bold text-amber-800 flex items-center gap-2"><Lightbulb size={18} /> Consejo</h5>
                            <p className="text-sm text-amber-700 mt-1">
                                Si ves que una semana tiene muchas tareas, habla con tu jefe para repartir mejor el trabajo.
                            </p>
                        </div>
                    </div>
                )
            },
            {
                title: 'Tu plan de trabajo',
                duration: '3 min',
                content: (
                    <div className="space-y-6">
                        <p className="text-slate-600">
                            En "Planning → Plan de Trabajo" ves TODAS tus tareas juntas, de todos los proyectos.
                        </p>

                        <div className="bg-slate-100 p-4 rounded-xl space-y-3">
                            <div className="flex items-center gap-3">
                                <Filter className="text-slate-500" />
                                <span className="font-bold text-slate-700">Puedes filtrar por:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {['Proyecto', 'Estado', 'Prioridad', 'Fecha'].map((f, i) => (
                                    <span key={i} className="bg-white px-3 py-1 rounded-full text-sm border border-slate-200">{f}</span>
                                ))}
                            </div>
                        </div>

                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <h5 className="font-bold text-emerald-800 mb-2">Puedes editar desde aquí</h5>
                            <p className="text-sm text-emerald-700">
                                No necesitas abrir cada tarea. Puedes cambiar el progreso y las fechas directamente en la tabla.
                            </p>
                        </div>
                    </div>
                )
            }
        ]
    },
    {
        id: 'liderazgo',
        title: 'Para Jefes',
        description: 'Cómo supervisar a tu equipo',
        icon: <Users />,
        color: 'bg-purple-600',
        gradient: 'from-purple-600 to-pink-500',
        lessons: [
            {
                title: 'Ver cómo va tu equipo',
                duration: '4 min',
                content: (
                    <div className="space-y-6">
                        <div className="bg-purple-500 p-5 rounded-2xl text-white">
                            <h4 className="font-bold text-lg mb-2">Tu trabajo como jefe en Planner-EF:</h4>
                            <p className="text-purple-100">
                                No ver tareas una por una, sino tener una visión general de cómo va todo.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h5 className="font-bold text-slate-700">En tu dashboard ves:</h5>
                            <div className="grid gap-2">
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="w-4 h-4 rounded-full bg-emerald-500" />
                                    <span className="text-sm text-slate-700">Cuántas tareas terminó el equipo hoy</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="w-4 h-4 rounded-full bg-amber-500" />
                                    <span className="text-sm text-slate-700">Cuántas tareas están atrasadas</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="w-4 h-4 rounded-full bg-rose-500" />
                                    <span className="text-sm text-slate-700">Quién tiene bloqueos y necesita ayuda</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                                    <span className="text-sm text-slate-700">Quién está sobrecargado de trabajo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Resolver bloqueos',
                duration: '4 min',
                content: (
                    <div className="space-y-6">
                        <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200">
                            <h4 className="font-bold text-rose-800 mb-2 flex items-center gap-2">
                                <ShieldAlert size={20} /> Tu prioridad #1
                            </h4>
                            <p className="text-rose-700">
                                Cuando alguien de tu equipo reporta un bloqueo, necesita tu ayuda.
                                Mientras más rápido lo resuelvas, antes puede seguir trabajando.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h5 className="font-bold text-slate-700">Qué hacer:</h5>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <div className="w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                                    <span className="text-sm">Recibes el aviso del bloqueo</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                                    <span className="text-sm">Contactas a quien pueda ayudar a resolverlo</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                                    <span className="text-sm">Resuelves el problema o lo escalas</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                                    <span className="text-sm">Marcas el bloqueo como "Resuelto" en el sistema</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Ver reportes',
                duration: '3 min',
                content: (
                    <div className="space-y-6">
                        <p className="text-slate-600">
                            Los reportes te ayudan a mostrar con números cómo va tu área.
                        </p>

                        <div className="grid gap-3">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <BarChart3 className="text-blue-500 mb-2" size={24} />
                                <h5 className="font-bold text-blue-800">Productividad</h5>
                                <p className="text-sm text-blue-600 mt-1">Cuántas tareas se completaron vs cuántas se planificaron</p>
                            </div>
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <Clock className="text-amber-500 mb-2" size={24} />
                                <h5 className="font-bold text-amber-800">Tiempos</h5>
                                <p className="text-sm text-amber-600 mt-1">Cuánto tardamos en resolver bloqueos</p>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <TrendingUp className="text-emerald-500 mb-2" size={24} />
                                <h5 className="font-bold text-emerald-800">Tendencias</h5>
                                <p className="text-sm text-emerald-600 mt-1">Comparar esta semana con la anterior</p>
                            </div>
                        </div>

                        <div className="bg-slate-100 p-4 rounded-xl flex items-center gap-3">
                            <Download className="text-slate-500" size={24} />
                            <div>
                                <h5 className="font-bold text-slate-700">Descargar a Excel</h5>
                                <p className="text-sm text-slate-500">Para presentaciones o análisis</p>
                            </div>
                        </div>
                    </div>
                )
            }
        ]
    },
    {
        id: 'tips',
        title: 'Consejos Útiles',
        description: 'Buenas prácticas para usar mejor el sistema',
        icon: <Lightbulb />,
        color: 'bg-amber-500',
        gradient: 'from-amber-500 to-orange-500',
        lessons: [
            {
                title: 'Rutina recomendada',
                duration: '3 min',
                content: (
                    <div className="space-y-6">
                        <div className="bg-amber-500 p-5 rounded-2xl text-white">
                            <h4 className="font-bold text-lg mb-2">🌅 En la mañana (5 minutos)</h4>
                            <ul className="space-y-1 text-amber-50 text-sm">
                                <li>1. Abre Planner-EF</li>
                                <li>2. Marca cómo te sientes</li>
                                <li>3. Elige tu tarea principal y las secundarias</li>
                                <li>4. ¡Listo! Ya puedes empezar a trabajar</li>
                            </ul>
                        </div>

                        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                            <h4 className="font-bold text-blue-800 mb-2">☀️ Durante el día</h4>
                            <ul className="space-y-1 text-blue-700 text-sm">
                                <li>• Marca las tareas que termines</li>
                                <li>• Si algo te bloquea, repórtalo de una vez</li>
                                <li>• Actualiza el progreso de tareas largas</li>
                            </ul>
                        </div>

                        <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
                            <h4 className="font-bold text-purple-800 mb-2">🌙 Antes de irte (2 minutos)</h4>
                            <ul className="space-y-1 text-purple-700 text-sm">
                                <li>• Escribe una nota corta de lo que hiciste</li>
                                <li>• Revisa qué quedó pendiente para mañana</li>
                            </ul>
                        </div>
                    </div>
                )
            },
            {
                title: 'Errores que debes evitar',
                duration: '4 min',
                content: (
                    <div className="space-y-4">
                        {[
                            { error: 'Planificar 20 tareas para un día', fix: 'Mejor 9 tareas máximo (1+3+5). Es más realista.' },
                            { error: 'Quedarte callado cuando algo te bloquea', fix: 'Reportar bloqueos es pedir ayuda, no quejarse.' },
                            { error: 'Actualizar todo al final del día', fix: 'Actualiza conforme avanzas. Así no se te olvida nada.' },
                            { error: 'Ignorar el estado de ánimo', fix: 'Es información útil, no pierdas tiempo saltándolo.' },
                            { error: 'No escribir notas en las tareas', fix: 'Una línea diaria = reporte automático al final de la semana.' },
                        ].map((item, i) => (
                            <div key={i} className="flex gap-3 p-4 bg-white rounded-xl border border-slate-200">
                                <Trash2 className="text-rose-400 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="font-medium text-rose-600 line-through">{item.error}</p>
                                    <p className="text-sm text-emerald-600 mt-1">✓ {item.fix}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
        ]
    }
];

export const TutorialPage: React.FC = () => {
    const [activeModule, setActiveModule] = useState(TUTORIAL_MODULES[0].id);
    const [activeLesson, setActiveLesson] = useState(0);
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

    const currentModule = TUTORIAL_MODULES.find((m) => m.id === activeModule) || TUTORIAL_MODULES[0];
    const currentModuleIndex = TUTORIAL_MODULES.findIndex((m) => m.id === activeModule);

    const markComplete = () => {
        const key = `${activeModule}-${activeLesson}`;
        setCompletedLessons(prev => new Set([...prev, key]));
    };

    const isComplete = (moduleId: string, lessonIdx: number) => completedLessons.has(`${moduleId}-${lessonIdx}`);

    const totalLessons = TUTORIAL_MODULES.reduce((acc, m) => acc + m.lessons.length, 0);
    const completedCount = completedLessons.size;
    const progressPercent = Math.round((completedCount / totalLessons) * 100);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
            {/* Sidebar */}
            <div className="w-full lg:w-80 bg-white border-r border-slate-200 lg:h-screen overflow-y-auto lg:sticky lg:top-0 shrink-0">
                <div className="p-5 border-b border-slate-100 bg-indigo-600 text-white">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <BookOpen size={24} />
                        Aprende a usar Planner-EF
                    </h1>
                    <p className="text-indigo-200 mt-1 text-sm">Paso a paso, sin complicaciones</p>

                    {/* Progress */}
                    <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
                        <div className="bg-white h-full transition-all" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className="text-xs text-indigo-200 mt-1">{completedCount} de {totalLessons} lecciones</p>
                </div>

                <div className="p-3 space-y-1">
                    {TUTORIAL_MODULES.map((module) => (
                        <div key={module.id}>
                            <button
                                onClick={() => { setActiveModule(module.id); setActiveLesson(0); }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeModule === module.id
                                    ? 'bg-slate-800 text-white'
                                    : 'hover:bg-slate-100 text-slate-600'
                                    }`}
                            >
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${activeModule === module.id ? 'bg-white/20' : `bg-gradient-to-br ${module.gradient} text-white`
                                    }`}>
                                    {module.icon}
                                </div>
                                <div className="text-left flex-1">
                                    <h3 className="font-bold text-sm">{module.title}</h3>
                                    <span className="text-[10px] opacity-70">{module.lessons.length} lecciones</span>
                                </div>
                                {activeModule === module.id && <ChevronRight size={16} />}
                            </button>

                            {activeModule === module.id && (
                                <div className="mt-1 ml-3 space-y-0.5 pl-3 border-l-2 border-slate-200">
                                    {module.lessons.map((lesson, lIdx) => (
                                        <button
                                            key={lIdx}
                                            onClick={() => setActiveLesson(lIdx)}
                                            className={`text-xs text-left w-full py-2 px-2 rounded-lg flex items-center gap-2 ${activeLesson === lIdx
                                                ? 'font-bold text-indigo-600 bg-indigo-50'
                                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                                }`}
                                        >
                                            {isComplete(module.id, lIdx) ? (
                                                <CheckCircle size={14} className="text-emerald-500" />
                                            ) : (
                                                <div className={`w-2 h-2 rounded-full ${activeLesson === lIdx ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                                            )}
                                            <span className="flex-1 truncate">{lesson.title}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-5 lg:p-10 overflow-y-auto">
                <div className="max-w-3xl mx-auto">
                    {/* Module Header */}
                    <div className="mb-6">
                        <span className="text-xs font-bold text-slate-400 uppercase">
                            Módulo {currentModuleIndex + 1} de {TUTORIAL_MODULES.length}
                        </span>
                        <h2 className="text-2xl font-bold text-slate-800 mt-1">{currentModule.title}</h2>
                    </div>

                    {/* Lesson Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${activeModule}-${activeLesson}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-100"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg lg:text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">
                                        {activeLesson + 1}
                                    </span>
                                    {currentModule.lessons[activeLesson].title}
                                </h3>
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full flex items-center gap-1">
                                    <Clock size={12} /> {currentModule.lessons[activeLesson].duration}
                                </span>
                            </div>

                            <div className="text-slate-600">
                                {currentModule.lessons[activeLesson].content}
                            </div>

                            {/* Mark Complete */}
                            {!isComplete(activeModule, activeLesson) ? (
                                <button
                                    onClick={markComplete}
                                    className="mt-6 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <CheckCircle size={18} /> Entendido, siguiente
                                </button>
                            ) : (
                                <div className="mt-6 w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold flex items-center justify-center gap-2 border border-emerald-200">
                                    <CheckCircle size={18} /> ¡Listo!
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="mt-6 flex justify-between items-center">
                        <button
                            onClick={() => {
                                if (activeLesson > 0) {
                                    setActiveLesson(activeLesson - 1);
                                } else if (currentModuleIndex > 0) {
                                    const prevModule = TUTORIAL_MODULES[currentModuleIndex - 1];
                                    setActiveModule(prevModule.id);
                                    setActiveLesson(prevModule.lessons.length - 1);
                                }
                            }}
                            disabled={activeLesson === 0 && currentModuleIndex === 0}
                            className="px-4 py-2 rounded-lg font-medium text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all flex items-center gap-1"
                        >
                            <ChevronLeft size={18} /> Anterior
                        </button>

                        {activeLesson < currentModule.lessons.length - 1 ? (
                            <button
                                onClick={() => setActiveLesson(activeLesson + 1)}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors flex items-center gap-1"
                            >
                                Siguiente <ChevronRight size={18} />
                            </button>
                        ) : currentModuleIndex < TUTORIAL_MODULES.length - 1 ? (
                            <button
                                onClick={() => {
                                    setActiveModule(TUTORIAL_MODULES[currentModuleIndex + 1].id);
                                    setActiveLesson(0);
                                }}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors flex items-center gap-1"
                            >
                                Siguiente módulo <ChevronRight size={18} />
                            </button>
                        ) : (
                            <div className="px-5 py-2 bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1">
                                🎉 ¡Terminaste!
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
