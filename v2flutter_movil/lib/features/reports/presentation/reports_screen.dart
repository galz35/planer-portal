import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../core/theme/app_theme.dart';
import '../../home/presentation/home_shell.dart';
import '../../dashboard/presentation/dashboard_controller.dart';
import '../../dashboard/data/dashboard_models.dart';

/// REPORTS SCREEN - Dashboard Ejecutivo Premium
/// Rediseñado para coincidir con la potencia y estética del Dashboard de React.
class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => DashboardController()..loadKPIs(),
      child: const Scaffold(
        backgroundColor: Color(0xFFF8FAFC),
        appBar: MomentusAppBar(
          title: 'Estadísticas',
          subtitle: 'Balance operativo y rendimiento',
        ),
        body: _DashboardContent(),
      ),
    );
  }
}

class _DashboardContent extends StatelessWidget {
  const _DashboardContent();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<DashboardController>();

    if (controller.loading && controller.data == null) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const ShimmerBox(width: double.infinity, height: 48, radius: 16),
          const SizedBox(height: 24),
          const ShimmerBox(width: double.infinity, height: 200, radius: 24),
          const SizedBox(height: 24),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.3,
            children: List.generate(
                4,
                (index) => const ShimmerBox(
                    width: double.infinity, height: 100, radius: 20)),
          ),
          const SizedBox(height: 24),
          const ShimmerBox(width: double.infinity, height: 250, radius: 24),
        ],
      );
    }

    if (controller.error != null && controller.data == null) {
      return _buildErrorState(controller);
    }

    final data = controller.data;
    if (data == null) {
      return _buildEmptyState(controller);
    }

    return RefreshIndicator(
      onRefresh: controller.loadKPIs,
      color: MomentusTheme.primary,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _buildPeriodSelector(controller),
          const SizedBox(height: 24),
          _buildMainEfficiencyCard(data.resumen),
          const SizedBox(height: 24),
          _buildKpiGrid(data.resumen),
          const SizedBox(height: 24),
          _buildDistributionChart(data.resumen),
          const SizedBox(height: 24),
          _buildProjectProgressSection(data.proyectos),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildPeriodSelector(DashboardController controller) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            onPressed: controller.prevMonth,
            icon: const Icon(Icons.chevron_left_rounded,
                color: Color(0xFF64748B)),
          ),
          Text(
            '${_getMonthName(controller.selectedMonth)} ${controller.selectedYear}',
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
            ),
          ),
          IconButton(
            onPressed: controller.nextMonth,
            icon: const Icon(Icons.chevron_right_rounded,
                color: Color(0xFF64748B)),
          ),
        ],
      ),
    );
  }

  Widget _buildMainEfficiencyCard(ResumenKPIS resumen) {
    final percent = resumen.promedioAvance.round();
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF334155)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('EFICIENCIA GLOBAL',
                    style: TextStyle(
                        color: Colors.white60,
                        fontSize: 11,
                        fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text('$percent%',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 48,
                        fontWeight: FontWeight.w900)),
                const SizedBox(height: 12),
                const Text(
                    'Cumplimiento basado en tareas finalizadas vs planificadas.',
                    style: TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
          Stack(
            alignment: Alignment.center,
            children: [
              SizedBox(
                width: 80,
                height: 80,
                child: CircularProgressIndicator(
                  value: percent / 100,
                  strokeWidth: 8,
                  backgroundColor: Colors.white12,
                  color: const Color(0xFF38BDF8),
                  strokeCap: StrokeCap.round,
                ),
              ),
              const Icon(Icons.bolt_rounded, color: Colors.white, size: 32),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKpiGrid(ResumenKPIS resumen) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.3,
      children: [
        _buildStatCard('Total Tareas', resumen.total.toString(),
            Icons.layers_outlined, const Color(0xFF64748B), Colors.white),
        _buildStatCard(
            'Hechas',
            resumen.hechas.toString(),
            Icons.check_circle_rounded,
            const Color(0xFF10B981),
            const Color(0xFFECFDF5)),
        _buildStatCard(
            'En Proceso',
            resumen.pendientes.toString(),
            Icons.play_circle_outline_rounded,
            const Color(0xFF3B82F6),
            const Color(0xFFEFF6FF)),
        _buildStatCard(
            'Bloqueos',
            resumen.bloqueadas.toString(),
            Icons.emergency_rounded,
            const Color(0xFFF43F5E),
            const Color(0xFFFFF1F2)),
      ],
    );
  }

  Widget _buildStatCard(
      String label, String value, IconData icon, Color color, Color bgColor) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Text(label.toUpperCase(),
                  style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: color.withValues(alpha: 0.7))),
            ],
          ),
          Text(value,
              style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: Color.lerp(color, Colors.black, 0.2))),
        ],
      ),
    );
  }

  Widget _buildDistributionChart(ResumenKPIS resumen) {
    final double chartMaxY =
        (resumen.total > 10) ? resumen.total.toDouble() * 1.1 : 12.0;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('DISTRIBUCIÓN DE ESTADO',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF94A3B8))),
          const SizedBox(height: 32),
          SizedBox(
            height: 180,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceEvenly,
                maxY: chartMaxY,
                barTouchData: BarTouchData(enabled: true),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        const labels = ['HECHAS', 'PROCESO', 'BLOQUEO'];
                        if (value.toInt() < labels.length) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 10),
                            child: Text(labels[value.toInt()],
                                style: const TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold)),
                          );
                        }
                        return const SizedBox();
                      },
                    ),
                  ),
                  leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                ),
                gridData: const FlGridData(show: false),
                borderData: FlBorderData(show: false),
                barGroups: [
                  _makeBarGroup(0, resumen.hechas.toDouble(),
                      const Color(0xFF10B981), chartMaxY),
                  _makeBarGroup(1, resumen.pendientes.toDouble(),
                      const Color(0xFF3B82F6), chartMaxY),
                  _makeBarGroup(2, resumen.bloqueadas.toDouble(),
                      const Color(0xFFF43F5E), chartMaxY),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  BarChartGroupData _makeBarGroup(int x, double y, Color color, double maxY) {
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(
          toY: y,
          color: color,
          width: 32,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
          backDrawRodData: BackgroundBarChartRodData(
              show: true, toY: maxY, color: const Color(0xFFF8FAFC)),
        ),
      ],
    );
  }

  Widget _buildProjectProgressSection(List<ProyectoKPI> proyectos) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('PROGRESO POR PROYECTO',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF94A3B8))),
          const SizedBox(height: 20),
          if (proyectos.isEmpty)
            const Center(
                child: Text('Sin proyectos registrados este mes',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)))
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: proyectos.length,
              separatorBuilder: (_, __) =>
                  const Divider(height: 32, color: Color(0xFFF1F5F9)),
              itemBuilder: (context, index) {
                final p = proyectos[index];
                final percent = p.avancePercent;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                            child: Text(p.proyecto,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 13),
                                overflow: TextOverflow.ellipsis)),
                        Text('$percent%',
                            style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 13,
                                color: _getBarColor(percent))),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: percent / 100,
                        backgroundColor: const Color(0xFFF1F5F9),
                        color: _getBarColor(percent),
                        minHeight: 6,
                      ),
                    ),
                  ],
                );
              },
            ),
        ],
      ),
    );
  }

  Color _getBarColor(int percent) {
    if (percent >= 80) return const Color(0xFF10B981);
    if (percent >= 40) return const Color(0xFF3B82F6);
    return const Color(0xFFF59E0B);
  }

  String _getMonthName(int month) {
    const months = [
      '',
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre'
    ];
    return months[month];
  }

  Widget _buildEmptyState(DashboardController controller) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.bar_chart_rounded,
              size: 64, color: Color(0xFFE2E8F0)),
          const SizedBox(height: 16),
          const Text('Sin datos para este periodo',
              style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          ElevatedButton(
              onPressed: controller.loadKPIs, child: const Text('Recargar')),
        ],
      ),
    );
  }

  Widget _buildErrorState(DashboardController controller) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(controller.error ?? 'Error desconocido'),
          const SizedBox(height: 24),
          ElevatedButton(
              onPressed: controller.loadKPIs, child: const Text('Reintentar')),
        ],
      ),
    );
  }
}
