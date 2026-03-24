import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class ProjectGanttView extends StatelessWidget {
  final List<dynamic> tasks;
  final Function(Map<String, dynamic>)? onTaskTap;

  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate800 = Color(0xFF1E293B);

  const ProjectGanttView({super.key, required this.tasks, this.onTaskTap});

  @override
  Widget build(BuildContext context) {
    if (tasks.isEmpty) {
      return const Center(
          child: Text('No hay tareas para mostrar en el Gantt'));
    }

    // 1. Determinar rango de fechas
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    DateTime minDate = today.subtract(const Duration(days: 5));
    DateTime maxDate = today.add(const Duration(days: 15));

    final validTasks = tasks.where((t) {
      final start =
          _parseDate(t['fechaInicioPlanificada'] ?? t['fechaCreacion']);
      final end = _parseDate(t['fechaFin'] ?? t['fechaObjetivo']);
      return start != null || end != null;
    }).toList();

    if (validTasks.isNotEmpty) {
      final starts = validTasks
          .map((t) =>
              _parseDate(t['fechaInicioPlanificada'] ?? t['fechaCreacion']))
          .whereType<DateTime>()
          .toList();
      if (starts.isNotEmpty) {
        final taskMin = starts.reduce((a, b) => a.isBefore(b) ? a : b);
        if (taskMin.isBefore(minDate)) {
          minDate = taskMin.subtract(const Duration(days: 2));
        }
      }

      final ends = validTasks
          .map((t) => _parseDate(t['fechaFin'] ?? t['fechaObjetivo']))
          .whereType<DateTime>()
          .toList();
      if (ends.isNotEmpty) {
        final taskMax = ends.reduce((a, b) => a.isAfter(b) ? a : b);
        if (taskMax.isAfter(maxDate)) {
          maxDate = taskMax.add(const Duration(days: 5));
        }
      }
    }

    const dayWidth = 60.0;
    const rowHeight = 60.0;
    final totalDays = maxDate.difference(minDate).inDays + 1;
    final chartWidth = totalDays * dayWidth;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: slate200.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ],
      ),
      margin: const EdgeInsets.all(16),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.vertical,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header de Fechas
              Container(
                height: 50,
                width: chartWidth,
                decoration: const BoxDecoration(
                  color: slate50,
                  border: Border(bottom: BorderSide(color: slate100)),
                ),
                child: Row(
                  children: List.generate(totalDays, (index) {
                    final date = minDate.add(Duration(days: index));
                    final isWeekend = date.weekday == 6 || date.weekday == 7;
                    final isTodayDate = date.year == today.year &&
                        date.month == today.month &&
                        date.day == today.day;

                    return Container(
                      width: dayWidth,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        border:
                            const Border(right: BorderSide(color: slate100)),
                        color: isTodayDate
                            ? Colors.indigo.withValues(alpha: 0.05)
                            : (isWeekend
                                ? slate100.withValues(alpha: 0.5)
                                : Colors.transparent),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            DateFormat('dd').format(date),
                            style: TextStyle(
                              fontSize: 12,
                              color: isTodayDate ? Colors.indigo : slate800,
                              fontWeight: isTodayDate
                                  ? FontWeight.w900
                                  : FontWeight.bold,
                            ),
                          ),
                          Text(
                            DateFormat('EEE').format(date).toUpperCase(),
                            style: TextStyle(
                              fontSize: 8,
                              color: isTodayDate ? Colors.indigo : slate400,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ),
              ),

              // Filas de Tareas
              Stack(
                children: [
                  // Grid background
                  Column(
                    children: List.generate(
                        validTasks.length,
                        (i) => Container(
                              height: rowHeight,
                              width: chartWidth,
                              decoration: const BoxDecoration(
                                border:
                                    Border(bottom: BorderSide(color: slate50)),
                              ),
                              child: Row(
                                children: List.generate(totalDays, (j) {
                                  final date = minDate.add(Duration(days: j));
                                  final isWeekend =
                                      date.weekday == 6 || date.weekday == 7;
                                  return Container(
                                    width: dayWidth,
                                    decoration: BoxDecoration(
                                      border: const Border(
                                          right: BorderSide(color: slate50)),
                                      color: isWeekend
                                          ? slate50.withValues(alpha: 0.5)
                                          : null,
                                    ),
                                  );
                                }),
                              ),
                            )),
                  ),

                  // Today Line
                  Positioned(
                    top: 0,
                    bottom: 0,
                    left: today.difference(minDate).inDays * dayWidth +
                        (dayWidth / 2),
                    child: Container(
                      width: 2,
                      color: Colors.indigo.withValues(alpha: 0.3),
                      child: Column(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Colors.indigo,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Task Bars
                  ...validTasks.asMap().entries.map((entry) {
                    final i = entry.key;
                    final task = entry.value;

                    final start = _parseDate(task['fechaInicioPlanificada'] ??
                            task['fechaCreacion']) ??
                        today;
                    final end =
                        _parseDate(task['fechaFin'] ?? task['fechaObjetivo']) ??
                            start.add(const Duration(days: 1));

                    final effectiveStart =
                        start.isBefore(minDate) ? minDate : start;
                    final effectiveEnd = end.isAfter(maxDate) ? maxDate : end;

                    final duration =
                        effectiveEnd.difference(effectiveStart).inDays + 1;
                    final offsetDays =
                        effectiveStart.difference(minDate).inDays;

                    final width = (duration <= 0 ? 1 : duration) * dayWidth;
                    final left = offsetDays * dayWidth;

                    final estado = task['estado']?.toString() ?? 'Pendiente';
                    final color = _getStatusColor(estado);

                    return Positioned(
                      left: left + 4,
                      top: (i * rowHeight) + 12,
                      child: GestureDetector(
                        onTap: () {
                          if (onTaskTap != null) {
                            onTaskTap!(task as Map<String, dynamic>);
                          }
                        },
                        child: Container(
                          width: width - 8,
                          height: 36,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [color, color.withValues(alpha: 0.8)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: color.withValues(alpha: 0.3),
                                blurRadius: 8,
                                offset: const Offset(0, 4),
                              )
                            ],
                          ),
                          alignment: Alignment.centerLeft,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  task['titulo'] ?? 'Sin título',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -0.2,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (width > 100)
                                Icon(
                                  _getStatusIcon(estado),
                                  color: Colors.white.withValues(alpha: 0.8),
                                  size: 14,
                                ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  DateTime? _parseDate(String? dateStr) {
    if (dateStr == null) return null;
    return DateTime.tryParse(dateStr);
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Hecha':
        return const Color(0xFF10B981); // emerald-500
      case 'En Curso':
      case 'EnCurso':
        return const Color(0xFF6366F1); // indigo-500
      case 'Bloqueada':
        return const Color(0xFFF43F5E); // rose-500
      case 'Revisión':
      case 'Revision':
        return const Color(0xFFF59E0B); // amber-500
      default:
        return const Color(0xFF94A3B8); // slate-400
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'Hecha':
        return Icons.check_circle_outline;
      case 'En Curso':
      case 'EnCurso':
        return Icons.play_circle_outline;
      case 'Bloqueada':
        return Icons.error_outline;
      case 'Revisión':
      case 'Revision':
        return Icons.rate_review_outlined;
      default:
        return Icons.help_outline;
    }
  }
}
