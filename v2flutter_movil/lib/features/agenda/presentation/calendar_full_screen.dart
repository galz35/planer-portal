import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:provider/provider.dart';
import 'agenda_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../home/presentation/home_shell.dart';

// ============================================================
// CALENDAR FULL SCREEN - Calendario con datos reales
// Replica la funcionalidad de CalendarView.tsx + AgendaSemanal.tsx
// ============================================================

class CalendarFullScreen extends StatefulWidget {
  const CalendarFullScreen({super.key});

  @override
  State<CalendarFullScreen> createState() => _CalendarFullScreenState();
}

class _CalendarFullScreenState extends State<CalendarFullScreen> {
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  // Tasks loaded from API
  List<Map<String, dynamic>> _allTasks = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;
    _loadMonthTasks(_focusedDay);
  }

  /// Load tasks for the visible month range (like React's AgendaSemanal)
  Future<void> _loadMonthTasks(DateTime month) async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      // Calculate month range (first day to last day of month)
      final firstDay = DateTime(month.year, month.month, 1);
      final lastDay = DateTime(month.year, month.month + 1, 0, 23, 59, 59);

      final startStr = firstDay.toIso8601String();
      final endStr = lastDay.toIso8601String();
      final todayStr = DateTime.now().toIso8601String();

      // Call the same endpoint as React: /mi-dia?fecha=&rangeStart=&rangeEnd=
      final response = await ApiClient.dio.get('mi-dia', queryParameters: {
        'fecha': todayStr,
        'rangeStart': startStr,
        'rangeEnd': endStr,
      });

      final rawData = response.data;
      Map<String, dynamic> data;
      if (rawData is Map<String, dynamic> &&
          rawData.containsKey('data') &&
          rawData['data'] is Map<String, dynamic>) {
        data = rawData['data'] as Map<String, dynamic>;
      } else if (rawData is Map<String, dynamic>) {
        data = rawData;
      } else {
        data = {};
      }

      // Merge tareasSugeridas + backlog (like React does)
      final List<dynamic> sugeridas = data['tareasSugeridas'] ?? [];
      final List<dynamic> backlog = data['backlog'] ?? [];
      final List<Map<String, dynamic>> merged = [];
      final seen = <int>{};

      for (final t in [...sugeridas, ...backlog]) {
        if (t is Map<String, dynamic>) {
          final id = t['idTarea'] ?? 0;
          if (id != 0 && seen.add(id)) {
            merged.add(t);
          }
        }
      }

      setState(() {
        _allTasks = merged;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Error al cargar tareas: $e';
        _loading = false;
      });
    }
  }

  /// Get tasks for a specific day (replicating React's getTasksForDay logic)
  List<Map<String, dynamic>> _getTasksForDay(DateTime day) {
    final dayStart = DateTime(day.year, day.month, day.day);

    return _allTasks.where((t) {
      final estado = (t['estado'] ?? '').toString();
      if (estado == 'Descartada' || estado == 'Eliminada') return false;

      final startStr = t['fechaInicioPlanificada']?.toString();
      final endStr =
          t['fechaObjetivo']?.toString() ?? t['fechaVencimiento']?.toString();
      final doneStr =
          t['fechaHecha']?.toString() ?? t['fechaFinReal']?.toString();

      final start = startStr != null ? DateTime.tryParse(startStr) : null;
      final end = endStr != null ? DateTime.tryParse(endStr) : null;
      final done = doneStr != null ? DateTime.tryParse(doneStr) : null;

      // If done, show on done date
      if (estado == 'Hecha' && done != null) {
        return isSameDay(day, done);
      }

      // Tasks without dates: show on today if pending
      if (start == null && end == null) {
        if (estado != 'Hecha') {
          return isSameDay(day, DateTime.now());
        }
        return false;
      }

      // Range check
      if (start != null && end != null) {
        final s = DateTime(start.year, start.month, start.day);
        final e = DateTime(end.year, end.month, end.day);
        return !dayStart.isBefore(s) && !dayStart.isAfter(e);
      }

      if (end != null) return isSameDay(day, end);
      if (start != null) return isSameDay(day, start);
      return false;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const MomentusAppBar(
        title: 'Calendario',
        subtitle: 'Resumen mensual de tareas',
        showBack: true,
      ),
      body: Column(
        children: [
          _buildCalendarCard(),
          const SizedBox(height: 4),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(20),
              child: Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: MomentusTheme.primary,
                  ),
                ),
              ),
            )
          else if (_error != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFCA5A5)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded,
                        color: Color(0xFFDC2626), size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF991B1B),
                          fontFamily: 'Inter',
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh_rounded, size: 20),
                      onPressed: () => _loadMonthTasks(_focusedDay),
                    ),
                  ],
                ),
              ),
            ),
          Expanded(child: _buildTaskList()),
        ],
      ),
    );
  }

  Widget _buildCalendarCard() {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: TableCalendar(
        firstDay: DateTime.utc(2020, 1, 1),
        lastDay: DateTime.utc(2030, 12, 31),
        focusedDay: _focusedDay,
        calendarFormat: _calendarFormat,
        selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
        locale: 'es_ES',
        headerStyle: const HeaderStyle(
          formatButtonVisible: false,
          titleCentered: true,
          titleTextStyle: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: MomentusTheme.slate800,
          ),
        ),
        calendarStyle: CalendarStyle(
          todayDecoration: BoxDecoration(
            color: MomentusTheme.primary.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          todayTextStyle: const TextStyle(
            color: MomentusTheme.primary,
            fontWeight: FontWeight.bold,
          ),
          selectedDecoration: const BoxDecoration(
            color: MomentusTheme.primary,
            shape: BoxShape.circle,
          ),
          markerDecoration: const BoxDecoration(
            color: MomentusTheme.primary,
            shape: BoxShape.circle,
          ),
          markersMaxCount: 3,
          markerSize: 5.0,
          markerMargin: const EdgeInsets.symmetric(horizontal: 0.8),
          markersAlignment: Alignment.bottomCenter,
        ),
        // Event loader: show dots for days with tasks
        eventLoader: (day) {
          if (_loading) return [];
          return _getTasksForDay(day);
        },
        onDaySelected: (selectedDay, focusedDay) {
          HapticFeedback.selectionClick();
          setState(() {
            _selectedDay = selectedDay;
            _focusedDay = focusedDay;
          });
        },
        onFormatChanged: (format) {
          setState(() {
            _calendarFormat = format;
          });
        },
        onPageChanged: (focusedDay) {
          _focusedDay = focusedDay;
          // Reload tasks when month changes
          _loadMonthTasks(focusedDay);
        },
      ),
    );
  }

  Widget _buildTaskList() {
    if (_loading) return const SizedBox.shrink();

    final dayTasks = _selectedDay != null ? _getTasksForDay(_selectedDay!) : [];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Day header with task count
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    '${_selectedDay?.day}/${_selectedDay?.month}/${_selectedDay?.year}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: MomentusTheme.slate800,
                      fontFamily: 'Inter',
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (dayTasks.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: MomentusTheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${dayTasks.length} tarea${dayTasks.length != 1 ? 's' : ''}',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: MomentusTheme.primary,
                          fontFamily: 'Inter',
                        ),
                      ),
                    ),
                ],
              ),
              TextButton.icon(
                onPressed: () {
                  final agendaCtrl = context.read<AgendaController>();
                  agendaCtrl.loadAgenda(_selectedDay);
                  Navigator.pop(context);
                },
                icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                label: const Text('Ver Agenda'),
              ),
            ],
          ),
          const Divider(),

          // Task list or empty state
          Expanded(
            child: dayTasks.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.event_note_rounded,
                            size: 48, color: Color(0xFFE2E8F0)),
                        SizedBox(height: 12),
                        Text(
                          'Sin tareas para este día',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 13,
                            fontFamily: 'Inter',
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: dayTasks.length,
                    padding: const EdgeInsets.only(bottom: 16),
                    itemBuilder: (context, index) {
                      final task = dayTasks[index];
                      return _buildTaskCard(task);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskCard(Map<String, dynamic> task) {
    final titulo = (task['titulo'] ?? 'Sin título').toString();
    final estado = (task['estado'] ?? 'Pendiente').toString();
    final prioridad = (task['prioridad'] ?? 'Media').toString();
    final proyectoNombre = task['proyectoNombre']?.toString();
    final isProject = task['idProyecto'] != null;
    final isDone = estado == 'Hecha' || estado == 'Completada';
    final isHighPriority = prioridad.toLowerCase() == 'alta';

    // Colors based on type
    Color accentColor;
    Color bgColor;
    if (isDone) {
      accentColor = const Color(0xFF10B981);
      bgColor = const Color(0xFFF1F5F9);
    } else if (isProject) {
      accentColor = const Color(0xFF6366F1);
      bgColor = const Color(0xFFEEF2FF);
    } else if (isHighPriority) {
      accentColor = const Color(0xFFEF4444);
      bgColor = const Color(0xFFFEF2F2);
    } else {
      accentColor = const Color(0xFFF59E0B);
      bgColor = Colors.white;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDone
              ? const Color(0xFFE2E8F0)
              : accentColor.withValues(alpha: 0.2),
        ),
        boxShadow: [
          if (!isDone)
            BoxShadow(
              color: accentColor.withValues(alpha: 0.06),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Status dot
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: isDone
                    ? const Color(0xFF10B981)
                    : isHighPriority
                        ? const Color(0xFFEF4444)
                        : accentColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 12),

            // Task info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    titulo,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      fontFamily: 'Inter',
                      color: isDone
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF334155),
                      decoration: isDone ? TextDecoration.lineThrough : null,
                      decorationColor: const Color(0xFFCBD5E1),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (proyectoNombre != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.folder_outlined,
                            size: 12, color: accentColor),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            proyectoNombre,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: accentColor,
                              fontFamily: 'Inter',
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            // Status badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isDone
                    ? const Color(0xFFECFDF5)
                    : accentColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                isDone
                    ? '✓'
                    : isProject
                        ? 'PRY'
                        : 'OP',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                  color: isDone ? const Color(0xFF059669) : accentColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
