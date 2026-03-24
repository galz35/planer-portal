import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';

import '../../agenda/domain/agenda_models.dart';
import 'agenda_controller.dart';
import '../../home/presentation/home_shell.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../tasks/presentation/quick_create_task_sheet.dart';

import '../../../core/theme/app_theme.dart';

// ============================================================
// AGENDA SCREEN - Diseño Corporativo Premium
// Inspirado en ActivePlanView.tsx de React
// ============================================================

class AgendaScreen extends StatelessWidget {
  const AgendaScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFFF8FAFC),
      appBar: MomentusAppBar(
        title: 'Mi Agenda',
        subtitle: 'Plan de trabajo diario',
      ),
      body: AgendaTab(),
    );
  }
}

class AgendaTab extends StatelessWidget {
  const AgendaTab({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AgendaController()..loadAgenda(),
      child: const _AgendaTabContent(),
    );
  }
}

class _AgendaTabContent extends StatelessWidget {
  const _AgendaTabContent();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AgendaController>();
    final authController = context.read<AuthController>();

    return Column(
      children: [
        // Offline banner
        if (!controller.loading &&
            controller.isOffline &&
            controller.data != null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
            color: const Color(0xFFFFF7ED),
            child: const Row(
              children: [
                Icon(Icons.wifi_off_rounded,
                    size: 18, color: Color(0xFFEA580C)),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Modo offline — mostrando datos guardados',
                    style: TextStyle(
                      fontSize: 13,
                      color: Color(0xFF9A3412),
                      fontWeight: FontWeight.w700,
                      fontFamily: 'Inter',
                    ),
                  ),
                ),
              ],
            ),
          ),

        // ✅ Alerta de Bloqueo (Igual que en React)
        if (!controller.loading &&
            controller.data != null &&
            controller.data!.bloqueosMeCulpan.isNotEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
            color: const Color(0xFFEF4444), // Rojo Alerta
            child: Row(
              children: [
                const Icon(Icons.front_hand_rounded,
                    size: 18, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '🛑 ¡ALERTA! Estás bloqueando el trabajo de ${controller.data!.bloqueosMeCulpan.length} compañero(s).',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Inter',
                    ),
                  ),
                ),
              ],
            ),
          ),
        _DateNavigator(controller: controller),
        Expanded(
          child: controller.loading
              ? SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      const ShimmerBox(
                          width: double.infinity, height: 100, radius: 12),
                      const SizedBox(height: 16),
                      for (int i = 0; i < 3; i++) ...[
                        const ShimmerBox(
                            width: double.infinity, height: 80, radius: 12),
                        const SizedBox(height: 12),
                      ],
                    ],
                  ),
                )
              : controller.error != null && controller.data == null
                  ? _ErrorState(
                      error: controller.error!,
                      onRetry: () => controller.loadAgenda())
                  : (controller.data == null)
                      ? const Center(child: Text("No hay datos disponibles"))
                      : _buildContent(context, controller, authController),
        ),
      ],
    );
  }

  Widget _buildContent(BuildContext context, AgendaController controller,
      AuthController authController) {
    if (controller.data?.checkinHoy != null) {
      return _ExecutionView(
        checkin: controller.data!.checkinHoy!,
        controller: controller,
        backlog: controller.data!.backlog,
        showGestion: controller.showGestion,
        showRapida: controller.showRapida,
      );
    }

    return _PlanningView(
      sugeridas: controller.data!.tareasSugeridas,
      backlog: controller.data!.backlog,
      controller: controller,
      userId: authController.user?.id ?? 0,
      showGestion: controller.showGestion,
      showRapida: controller.showRapida,
    );
  }
}

// ============================================================
// DATE NAVIGATOR - Estilo corporativo slate
// ============================================================

class _DateNavigator extends StatelessWidget {
  final AgendaController controller;
  const _DateNavigator({required this.controller});

  bool get _isToday {
    final now = DateTime.now();
    return controller.currentDate.year == now.year &&
        controller.currentDate.month == now.month &&
        controller.currentDate.day == now.day;
  }

  Future<void> _selectDate(BuildContext context) async {
    HapticFeedback.lightImpact();
    final picked = await showDatePicker(
      context: context,
      initialDate: controller.currentDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: MomentusTheme.primary,
              onPrimary: Colors.white,
              onSurface: Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) controller.loadAgenda(picked);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
      ),
      child: Row(
        children: [
          // Nav izquierda
          _navButton(Icons.chevron_left_rounded, () {
            HapticFeedback.selectionClick();
            controller.prevDay();
          }),
          const SizedBox(width: 8),

          // Fecha central
          Expanded(
            child: GestureDetector(
              onTap: () => _selectDate(context),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: _isToday
                      ? MomentusTheme.slate800
                      : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.calendar_today_rounded,
                        size: 14,
                        color: _isToday
                            ? Colors.white70
                            : const Color(0xFF64748B)),
                    const SizedBox(width: 8),
                    Text(
                      _isToday
                          ? 'HOY'
                          : "${controller.currentDate.day}/${controller.currentDate.month}",
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color:
                            _isToday ? Colors.white : const Color(0xFF334155),
                        letterSpacing: 0.8,
                      ),
                    ),
                    if (_isToday) ...[
                      const SizedBox(width: 6),
                      Text(
                        "${controller.currentDate.day}/${controller.currentDate.month}",
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontWeight: FontWeight.w400,
                          fontSize: 12,
                          color: Colors.white54,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Nav derecha
          _navButton(Icons.chevron_right_rounded, () {
            HapticFeedback.selectionClick();
            controller.nextDay();
          }),
        ],
      ),
    );
  }

  Widget _navButton(IconData icon, VoidCallback onTap) {
    return Material(
      color: const Color(0xFFF1F5F9),
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: controller.loading ? null : onTap,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, color: const Color(0xFF64748B), size: 22),
        ),
      ),
    );
  }
}

class _PlanningView extends StatefulWidget {
  final List<Tarea> sugeridas;
  final List<Tarea> backlog;
  final AgendaController controller;
  final int userId;
  final bool showGestion;
  final bool showRapida;

  const _PlanningView({
    required this.sugeridas,
    required this.backlog,
    required this.controller,
    required this.userId,
    required this.showGestion,
    required this.showRapida,
  });

  @override
  State<_PlanningView> createState() => _PlanningViewState();
}

class _PlanningViewState extends State<_PlanningView>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  // Helper: todas las tareas disponibles (sin duplicados y no hechas)
  List<Tarea> get _allTasks {
    final seen = <int>{};
    return [...widget.sugeridas, ...widget.backlog]
        .where((t) => ![
              'Hecha',
              'Completada',
              'Terminada',
              'Inactiva',
              'Descartada'
            ].contains(t.estado))
        .where((t) => seen.add(t.idTarea))
        .toList();
  }

  bool _isOverdue(Tarea t) {
    if (t.fechaObjetivo == null) return false;
    final date = DateTime.tryParse(t.fechaObjetivo!);
    if (date == null) return false;
    return date.isBefore(DateTime(
        DateTime.now().year, DateTime.now().month, DateTime.now().day));
  }

  List<Tarea> get _overdueTasks => _allTasks.where(_isOverdue).toList();

  // Abrir selector de tareas (buzón)
  void _openTaskSelector([String category = 'MAIN']) {
    final alreadySelected = <int>{
      ...widget.controller.selectedMainIds,
      ...widget.controller.selectedGestionIds,
      ...widget.controller.selectedRapidaIds,
    };

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _TaskSelectorSheet(
        available: _allTasks
            .where((t) => !alreadySelected.contains(t.idTarea))
            .toList(),
        onSelect: (tarea) {
          Navigator.pop(ctx);
          widget.controller.toggleTask(tarea.idTarea, category);
        },
        onQuickCreate: () {
          Navigator.pop(ctx);
          QuickCreateTaskSheet.show(context, onCreated: () {
            // Recargar agenda después de crear tarea para que aparezca
            widget.controller.loadAgenda();
          });
        },
      ),
    );
  }

  // Modal de configuración de vista
  void _showViewSettings() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Configuración de Agenda',
                  style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 16,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              const Text('Elige qué secciones ver en tu plan diario',
                  style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
              const SizedBox(height: 16),
              SwitchListTile(
                title: const Text('Gestión / Avance',
                    style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Tareas secundarias o seguimiento'),
                value: widget.showGestion,
                activeThumbColor: const Color(0xFF0284C7),
                onChanged: (v) {
                  Navigator.pop(ctx);
                  widget.controller.updateConfig(gestion: v);
                },
              ),
              SwitchListTile(
                title: const Text('Rápida / Extra',
                    style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Pequeñas acciones del día'),
                value: widget.showRapida,
                activeThumbColor: const Color(0xFFD97706),
                onChanged: (v) {
                  Navigator.pop(ctx);
                  widget.controller.updateConfig(rapida: v);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final selectedCount = widget.controller.selectedMainIds.length +
        widget.controller.selectedGestionIds.length +
        widget.controller.selectedRapidaIds.length;
    final overdueCount = _overdueTasks.length;

    return Stack(
      children: [
        // Cuerpo Principal
        Column(
          children: [
            // ── TAB BAR ──
            Container(
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                controller: _tabCtrl,
                indicator: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                indicatorPadding: const EdgeInsets.all(3),
                dividerHeight: 0,
                labelColor: MomentusTheme.slate900,
                unselectedLabelColor: const Color(0xFF94A3B8),
                labelStyle: const TextStyle(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
                unselectedLabelStyle: const TextStyle(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w500,
                  fontSize: 12,
                ),
                tabs: [
                  Tab(
                    height: 40,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.track_changes_outlined, size: 18),
                        const SizedBox(width: 4),
                        Text(
                            'Tareas (${widget.controller.selectedMainIds.length})'),
                      ],
                    ),
                  ),
                  Tab(
                    height: 40,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.access_time_rounded, size: 18),
                        const SizedBox(width: 4),
                        const Text('Atrasadas'),
                        if (overdueCount > 0) ...[
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: MomentusTheme.primary,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '$overdueCount',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // ── TAB CONTENT ──
            Expanded(
              child: TabBarView(
                controller: _tabCtrl,
                children: [
                  // TAB 1: TAREAS
                  _buildFocoTab(),
                  // TAB 2: ATRASADAS
                  _buildPendientesTab(),
                ],
              ),
            ),
          ],
        ),

        // FAB Simulado (Posicionado manualmente para evitar Scaffold anidado)
        Positioned(
          bottom: 16,
          right: 16,
          child: FloatingActionButton.extended(
            onPressed: widget.controller.startDayLoading || selectedCount == 0
                ? null
                : () => widget.controller.saveCheckin(widget.userId),
            label: widget.controller.startDayLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2))
                : Text(
                    'Confirmar Plan ($selectedCount)',
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 13),
                  ),
            icon: widget.controller.startDayLoading
                ? null
                : const Icon(Icons.rocket_launch_rounded, size: 18),
            backgroundColor: selectedCount > 0
                ? MomentusTheme.slate900
                : MomentusTheme.slate400,
            foregroundColor: Colors.white,
            elevation: selectedCount > 0 ? 6 : 0,
          ),
        ),
      ],
    );
  }

  // ── TAB 1: MIS TAREAS ──
  Widget _buildFocoTab() {
    final mainIds = widget.controller.selectedMainIds;
    final mainTasks =
        _allTasks.where((t) => mainIds.contains(t.idTarea)).toList();

    return RefreshIndicator(
      onRefresh: () async => await widget.controller.loadAgenda(),
      color: MomentusTheme.primary,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFEEF2FF), Color(0xFFE0E7FF)],
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFC7D2FE)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.track_changes_rounded,
                      color: Color(0xFF4F46E5), size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Mis Tareas',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF3730A3),
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Lo que haré hoy',
                        style: TextStyle(
                          fontSize: 11,
                          color: Color(0xFF6366F1),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                // Botón de configuración de vista
                GestureDetector(
                  onTap: () => _showViewSettings(),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.tune_rounded,
                        color: Color(0xFF4F46E5), size: 18),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Slots principales
          if (mainTasks.isNotEmpty) ...[
            ...mainTasks.map((t) => Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: _SlotCard(
                    task: t,
                    accentColor: MomentusTheme.primary,
                    onRemove: () =>
                        widget.controller.toggleTask(t.idTarea, 'MAIN'),
                  ),
                )),
          ],

          // Botón para agregar
          _EmptySlot(
            label: mainTasks.isEmpty
                ? 'Agregar tarea al plan'
                : 'Agregar otra tarea',
            hint: mainTasks.isEmpty
                ? 'Toca para elegir de tu buzón'
                : 'Define tu día completo',
            accentColor: MomentusTheme.primary,
            icon: Icons.add_circle_outline_rounded,
            onTap: () => _openTaskSelector('MAIN'),
          ),

          // ALERTA DE VENCIDAS (Link a Tab 2)
          if (_overdueTasks
              .where(
                  (t) => !widget.controller.selectedMainIds.contains(t.idTarea))
              .isNotEmpty) ...[
            const SizedBox(height: 16),
            InkWell(
              onTap: () {
                HapticFeedback.selectionClick();
                _tabCtrl.animateTo(1); // Ir a Pendientes (Atrasadas)
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFED7AA)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.access_time_filled_rounded,
                        color: Color(0xFFEA580C), size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 13,
                              color: Color(0xFF9A3412)),
                          children: [
                            const TextSpan(text: 'Tienes '),
                            TextSpan(
                              text:
                                  '${_overdueTasks.where((t) => !widget.controller.selectedMainIds.contains(t.idTarea)).length} tareas atrasadas',
                              style:
                                  const TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const Icon(Icons.arrow_forward_rounded,
                        color: Color(0xFFF97316), size: 16),
                  ],
                ),
              ),
            ),
          ],

          const SizedBox(height: 24),

          // Sugerencias rápidas (tareas con prioridad alta)
          if (_allTasks
              .where((t) =>
                  t.prioridad.toLowerCase() == 'alta' &&
                  !mainIds.contains(t.idTarea))
              .isNotEmpty) ...[
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: Text(
                'SUGERENCIAS',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF94A3B8),
                  letterSpacing: 1.5,
                ),
              ),
            ),
            ..._allTasks
                .where((t) =>
                    t.prioridad.toLowerCase() == 'alta' &&
                    !mainIds.contains(t.idTarea))
                .take(3)
                .map((t) => _SuggestionChip(
                      task: t,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        widget.controller.toggleTask(t.idTarea, 'MAIN');
                      },
                    )),
          ],

          // ── SECCIÓN GESTIÓN (Condicional) ──
          if (widget.showGestion) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [Color(0xFFF0F9FF), Color(0xFFE0F2FE)]),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFBAE6FD)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0284C7).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.sync_alt_rounded,
                        color: Color(0xFF0284C7), size: 20),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Gestión / Avance',
                            style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF075985))),
                        SizedBox(height: 2),
                        Text('Tareas secundarias o seguimiento',
                            style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFF0284C7),
                                fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            ...widget.controller.selectedGestionIds.map((id) {
              final t = _allTasks.where((t) => t.idTarea == id).firstOrNull;
              if (t == null) return const SizedBox.shrink();
              return Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: _SlotCard(
                  task: t,
                  accentColor: const Color(0xFF0284C7),
                  onRemove: () =>
                      widget.controller.toggleTask(t.idTarea, 'GESTION'),
                ),
              );
            }),
            _EmptySlot(
              label: 'Agregar tarea de gestión',
              hint: 'Tareas de seguimiento o apoyo',
              accentColor: const Color(0xFF0284C7),
              icon: Icons.add_circle_outline_rounded,
              onTap: () => _openTaskSelector('GESTION'),
            ),
          ],

          // ── SECCIÓN RÁPIDA (Condicional) ──
          if (widget.showRapida) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [Color(0xFFFFFBEB), Color(0xFFFEF3C7)]),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD97706).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.flash_on_rounded,
                        color: Color(0xFFD97706), size: 20),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Rápida / Extra',
                            style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF92400E))),
                        SizedBox(height: 2),
                        Text('Pequeñas acciones del día',
                            style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFFD97706),
                                fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            ...widget.controller.selectedRapidaIds.map((id) {
              final t = _allTasks.where((t) => t.idTarea == id).firstOrNull;
              if (t == null) return const SizedBox.shrink();
              return Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: _SlotCard(
                  task: t,
                  accentColor: const Color(0xFFD97706),
                  onRemove: () =>
                      widget.controller.toggleTask(t.idTarea, 'RAPIDA'),
                ),
              );
            }),
            _EmptySlot(
              label: 'Agregar tarea rápida',
              hint: 'Acciones pequeñas o adicionales',
              accentColor: const Color(0xFFD97706),
              icon: Icons.add_circle_outline_rounded,
              onTap: () => _openTaskSelector('RAPIDA'),
            ),
          ],
        ],
      ),
    );
  }

  // Se eliminó _buildGestionTab por solicitud de UX Simplificada

  // ── TAB 2: PENDIENTES (Overdue) ──
  Widget _buildPendientesTab() {
    final overdueList = _overdueTasks;

    return RefreshIndicator(
      onRefresh: () async => await widget.controller.loadAgenda(),
      color: MomentusTheme.primary,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
        children: [
          // Header
          if (overdueList.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              child: const Column(
                children: [
                  Icon(Icons.check_circle_outline_rounded,
                      size: 56, color: Color(0xFF10B981)),
                  SizedBox(height: 16),
                  Text(
                    '¡Todo al día!',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF334155),
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'No tienes tareas atrasadas',
                    style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            )
          else ...[
            // Warning banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFFF5F5), Color(0xFFFFEBEE)],
                ),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFFCDD2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      color: Color(0xFFE53935), size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${overdueList.length} tarea${overdueList.length == 1 ? '' : 's'} atrasada${overdueList.length == 1 ? '' : 's'}',
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFC62828),
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Agrega las urgentes a tu plan del día o complétalas',
                          style: TextStyle(
                            fontSize: 11,
                            color: Color(0xFFEF5350),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Lista de tareas atrasadas
            ...overdueList.map((t) {
              final isSelected =
                  widget.controller.selectedMainIds.contains(t.idTarea);
              final fechaStr = t.fechaObjetivo?.split('T')[0] ?? '';

              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFFFFF5F5) : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected
                          ? MomentusTheme.primary
                          : const Color(0xFFFFCDD2),
                      width: isSelected ? 1.5 : 1,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color:
                                  MomentusTheme.primary.withValues(alpha: 0.1),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ]
                        : null,
                  ),
                  child: Row(
                    children: [
                      // Checkbox visual para completar
                      IconButton(
                        onPressed: () async {
                          HapticFeedback.lightImpact();
                          ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Completando tarea...'),
                                  duration: Duration(seconds: 1)));
                          await widget.controller.completeTask(t.idTarea);
                        },
                        icon: const Icon(Icons.radio_button_unchecked,
                            color: Color(0xFFEF9A9A)),
                        tooltip: 'Marcar como completada',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        style: IconButton.styleFrom(
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                      ),
                      const SizedBox(width: 10),

                      // Contenido clickeable para seleccionar
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            HapticFeedback.selectionClick();
                            widget.controller.toggleTask(t.idTarea, 'MAIN');
                          },
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t.titulo,
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontWeight: isSelected
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                  fontSize: 13,
                                  color: const Color(0xFF334155),
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  if (t.proyectoNombre != null) ...[
                                    Text(
                                      t.proyectoNombre!,
                                      style: const TextStyle(
                                          fontSize: 11,
                                          color: Color(0xFF94A3B8)),
                                    ),
                                    const Text(' • ',
                                        style: TextStyle(
                                            color: Color(0xFFCBD5E1))),
                                  ],
                                  Text(
                                    'Venció: $fechaStr',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: Color(0xFFEF5350),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  if (t.responsableNombre != null) ...[
                                    const Text(' • ',
                                        style: TextStyle(
                                            color: Color(0xFFCBD5E1))),
                                    Text(
                                      t.responsableNombre!
                                          .split(' ')
                                          .take(2)
                                          .join(' '),
                                      style: const TextStyle(
                                          fontSize: 11,
                                          color: Color(0xFF7C3AED),
                                          fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Botón Descartar (Igual que en React)
                      IconButton(
                        onPressed: () async {
                          HapticFeedback.heavyImpact();
                          final ok = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: const Text('¿Descartar tarea?'),
                                  content: const Text(
                                      'La tarea desaparecerá de tu agenda y del buzón.'),
                                  actions: [
                                    TextButton(
                                        onPressed: () =>
                                            Navigator.pop(ctx, false),
                                        child: const Text('CANCELAR')),
                                    TextButton(
                                        onPressed: () =>
                                            Navigator.pop(ctx, true),
                                        child: const Text('DESCARTAR',
                                            style:
                                                TextStyle(color: Colors.red))),
                                  ],
                                ),
                              ) ??
                              false;
                          if (ok) {
                            await widget.controller.discardTask(t.idTarea);
                          }
                        },
                        icon: const Icon(Icons.delete_outline_rounded,
                            color: Color(0xFF94A3B8), size: 20),
                        tooltip: 'Descartar tarea',
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ],
      ),
    );
  }
}

// ============================================================
// SLOT CARD - Tarea seleccionada en un slot
// ============================================================

class _SlotCard extends StatelessWidget {
  final Tarea task;
  final Color accentColor;
  final VoidCallback onRemove;

  const _SlotCard({
    required this.task,
    required this.accentColor,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(
          left: BorderSide(color: accentColor, width: 4),
          top: BorderSide(color: accentColor.withValues(alpha: 0.15)),
          right: BorderSide(color: accentColor.withValues(alpha: 0.15)),
          bottom: BorderSide(color: accentColor.withValues(alpha: 0.15)),
        ),
        boxShadow: [
          BoxShadow(
            color: accentColor.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(Icons.check_circle_rounded, color: accentColor, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task.titulo,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: Color(0xFF1E293B),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                // Badges row: proyecto + responsable + atraso
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  children: [
                    if (task.proyectoNombre != null)
                      _infoBadge(
                        task.proyectoNombre!,
                        const Color(0xFFF1F5F9),
                        const Color(0xFF64748B),
                      ),
                    if (task.responsableNombre != null)
                      _infoBadge(
                        'Asig: ${task.responsableNombre!.split(' ').take(2).join(' ')}',
                        const Color(0xFFF3E8FF),
                        const Color(0xFF7C3AED),
                      ),
                    if (task.esAtrasada && task.diasAtraso > 0)
                      _infoBadge(
                        '${task.diasAtraso}d atraso',
                        const Color(0xFFFEF2F2),
                        const Color(0xFFDC2626),
                      ),
                  ],
                ),
              ],
            ),
          ),
          // Botón quitar
          GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              onRemove();
            },
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.close_rounded,
                  size: 18, color: Color(0xFF94A3B8)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoBadge(String text, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}

// ============================================================
// EMPTY SLOT - Placeholder para agregar tarea
// ============================================================

class _EmptySlot extends StatelessWidget {
  final String label;
  final String hint;
  final Color accentColor;
  final IconData icon;
  final VoidCallback onTap;

  const _EmptySlot({
    required this.label,
    required this.hint,
    required this.accentColor,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        decoration: BoxDecoration(
          color: accentColor.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: accentColor.withValues(alpha: 0.25),
            width: 1.5,
            strokeAlign: BorderSide.strokeAlignInside,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: accentColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: accentColor),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: accentColor,
                  ),
                ),
                Text(
                  hint,
                  style: TextStyle(
                    fontSize: 11,
                    color: accentColor.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// SUGGESTION CHIP - Tarea sugerida para selección rápida
// ============================================================

class _SuggestionChip extends StatelessWidget {
  final Tarea task;
  final VoidCallback onTap;

  const _SuggestionChip({required this.task, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            const Icon(Icons.add_circle_outline_rounded,
                size: 18, color: Color(0xFFCBD5E1)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.titulo,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontWeight: FontWeight.w500,
                      fontSize: 13,
                      color: Color(0xFF475569),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (task.proyectoNombre != null ||
                      task.responsableNombre != null)
                    Row(
                      children: [
                        if (task.proyectoNombre != null)
                          Text(
                            task.proyectoNombre!,
                            style: const TextStyle(
                                fontSize: 10, color: Color(0xFF94A3B8)),
                            maxLines: 1,
                          ),
                        if (task.proyectoNombre != null &&
                            task.responsableNombre != null)
                          const Text(' • ',
                              style: TextStyle(
                                  fontSize: 10, color: Color(0xFFCBD5E1))),
                        if (task.responsableNombre != null)
                          Text(
                            'Asig: ${task.responsableNombre!.split(' ').take(2).join(' ')}',
                            style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFF7C3AED),
                                fontWeight: FontWeight.w600),
                            maxLines: 1,
                          ),
                      ],
                    ),
                ],
              ),
            ),
            if (task.prioridad.toLowerCase() == 'alta')
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'ALTA',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFDC2626),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// TASK SELECTOR SHEET (Buzón) - Bottom Sheet para elegir tarea
// ============================================================

class _TaskSelectorSheet extends StatefulWidget {
  final List<Tarea> available;
  final Function(Tarea) onSelect;
  final VoidCallback? onQuickCreate;

  const _TaskSelectorSheet({
    required this.available,
    required this.onSelect,
    this.onQuickCreate,
  });

  @override
  State<_TaskSelectorSheet> createState() => _TaskSelectorSheetState();
}

class _TaskSelectorSheetState extends State<_TaskSelectorSheet> {
  String _search = '';
  final _searchCtrl = TextEditingController();

  List<Tarea> get _filtered {
    if (_search.isEmpty) return widget.available;
    final q = _search.toLowerCase();
    return widget.available.where((t) {
      return t.titulo.toLowerCase().contains(q) ||
          (t.proyectoNombre?.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const accentColor = MomentusTheme.primary;

    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.5,
      maxChildSize: 0.92,
      builder: (context, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // Handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10),
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.adjust_rounded,
                      size: 18,
                      color: accentColor,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Seleccionar Tarea',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        Text(
                          '${widget.available.length} disponibles',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Crear nueva
                  if (widget.onQuickCreate != null)
                    GestureDetector(
                      onTap: widget.onQuickCreate,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: MomentusTheme.slate900,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.add_rounded,
                                size: 14, color: Colors.white),
                            SizedBox(width: 4),
                            Text(
                              'Crear',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Search bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: TextField(
                controller: _searchCtrl,
                onChanged: (v) => setState(() => _search = v),
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                decoration: InputDecoration(
                  hintText: 'Buscar tarea...',
                  hintStyle: const TextStyle(color: Color(0xFFCBD5E1)),
                  prefixIcon: const Icon(Icons.search_rounded,
                      color: Color(0xFF94A3B8), size: 20),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),

            const Divider(height: 1, color: Color(0xFFF1F5F9)),

            // Lista
            Expanded(
              child: _filtered.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.inbox_rounded,
                              size: 48, color: Color(0xFFE2E8F0)),
                          const SizedBox(height: 12),
                          Text(
                            _search.isEmpty
                                ? 'No hay tareas disponibles'
                                : 'Sin resultados para "$_search"',
                            style: const TextStyle(
                                color: Color(0xFF94A3B8), fontSize: 13),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      controller: scrollCtrl,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      itemCount: _filtered.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 6),
                      itemBuilder: (_, i) {
                        final t = _filtered[i];
                        return GestureDetector(
                          onTap: () => widget.onSelect(t),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border:
                                  Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      // Badges
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFF1F5F9),
                                              borderRadius:
                                                  BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              t.proyectoNombre ?? 'Inbox',
                                              style: const TextStyle(
                                                fontSize: 9,
                                                fontWeight: FontWeight.w700,
                                                color: Color(0xFF64748B),
                                              ),
                                            ),
                                          ),
                                          if (t.prioridad.toLowerCase() ==
                                              'alta') ...[
                                            const SizedBox(width: 4),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 6,
                                                      vertical: 2),
                                              decoration: BoxDecoration(
                                                color: MomentusTheme.primary,
                                                borderRadius:
                                                    BorderRadius.circular(4),
                                              ),
                                              child: const Text(
                                                'ALTA',
                                                style: TextStyle(
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.w800,
                                                  color: Colors.white,
                                                ),
                                              ),
                                            ),
                                          ],
                                          if (t.responsableNombre != null) ...[
                                            const SizedBox(width: 4),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 6,
                                                      vertical: 2),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFF3E8FF),
                                                borderRadius:
                                                    BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                'Asig: ${t.responsableNombre!.split(' ').take(2).join(' ')}',
                                                style: const TextStyle(
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.w700,
                                                  color: Color(0xFF7C3AED),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        t.titulo,
                                        style: const TextStyle(
                                          fontFamily: 'Inter',
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14,
                                          color: Color(0xFF1E293B),
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: accentColor.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(Icons.add_rounded,
                                      size: 16, color: accentColor),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// EXECUTION VIEW - Plan Activo (Post-Checkin)
// Inspirado en ActivePlanView.tsx de React
// ============================================================

// ============================================================
// EXECUTION VIEW - Plan Activo (Post-Checkin)
// Inspirado en ActivePlanView.tsx de React
// ============================================================

class _ExecutionView extends StatefulWidget {
  final Checkin checkin;
  final List<Tarea> backlog;
  final AgendaController controller;
  final bool showGestion;
  final bool showRapida;

  const _ExecutionView({
    required this.checkin,
    required this.backlog,
    required this.controller,
    required this.showGestion,
    required this.showRapida,
  });

  @override
  State<_ExecutionView> createState() => _ExecutionViewState();
}

class _ExecutionViewState extends State<_ExecutionView>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ── TAB BAR ──
        Container(
          margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
          ),
          child: TabBar(
            controller: _tabCtrl,
            indicator: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            indicatorSize: TabBarIndicatorSize.tab,
            indicatorPadding: const EdgeInsets.all(3),
            dividerHeight: 0,
            labelColor: MomentusTheme.slate900,
            unselectedLabelColor: const Color(0xFF94A3B8),
            labelStyle: const TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
            unselectedLabelStyle: const TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w500,
              fontSize: 12,
            ),
            tabs: const [
              Tab(
                height: 40,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle_outlined, size: 18),
                    SizedBox(width: 4),
                    Text('Mi Día'),
                  ],
                ),
              ),
              Tab(
                height: 40,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.inbox_outlined, size: 18),
                    SizedBox(width: 4),
                    Text('Pendientes'),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),

        // ── CONTENT ──
        Expanded(
          child: TabBarView(
            controller: _tabCtrl,
            children: [
              _buildMyDayTab(),
              _buildBacklogTab(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMyDayTab() {
    final tareas = widget.checkin.tareas;
    final sortedTasks = List<CheckinTarea>.from(tareas)
      ..sort((a, b) {
        if (a.tipo == 'Entrego') return -1;
        if (b.tipo == 'Entrego') return 1;
        return 0;
      });

    final focusTasks = sortedTasks.where((t) => t.tipo == 'Entrego').toList();

    // Progress calc
    final allValid = sortedTasks.where((t) => t.tarea != null).toList();
    final totalCount = allValid.length;
    final doneCount = allValid.where((t) => t.tarea!.estado == 'Hecha').length;
    final progressPct =
        totalCount > 0 ? (doneCount / totalCount * 100).round() : 0;

    return RefreshIndicator(
      onRefresh: () async => await widget.controller.loadAgenda(),
      color: MomentusTheme.primary,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(
            16, 12, 16, 16 + MediaQuery.of(context).padding.bottom),
        children: [
          // ── PROGRESS HEADER ──
          _ProgressHeader(
              done: doneCount, total: totalCount, percent: progressPct),
          const SizedBox(height: 20),

          // ── FOCUS SECTION ──
          if (focusTasks.isNotEmpty) ...[
            _ExecutionSection(
              title: '🎯 TAREA PRINCIPAL',
              accentColor: MomentusTheme.primary,
              headerBg: const Color(0xFFFFF5F5),
              borderColor: const Color(0xFFFFE4E6),
              tasks: focusTasks,
              controller: widget.controller,
              isMain: true,
            ),
            const SizedBox(height: 16),
          ],

          if (tareas.isEmpty)
            const _EmptySection('Día libre o sin tareas planificadas.'),

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildBacklogTab() {
    final backlogList = widget.backlog;

    if (backlogList.isEmpty) {
      return const Center(child: _EmptySection('No tienes tareas pendientes.'));
    }

    return RefreshIndicator(
      onRefresh: () async => await widget.controller.loadAgenda(),
      color: MomentusTheme.primary,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
        itemCount: backlogList.length,
        itemBuilder: (context, index) {
          final t = backlogList[index];
          // Reusar SlotCard o similar, pero simplificado para backlog
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                const Icon(Icons.circle_outlined,
                    size: 18, color: Color(0xFFCBD5E1)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        t.titulo,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontWeight: FontWeight.w500,
                          fontSize: 13,
                          color: Color(0xFF334155),
                        ),
                      ),
                      if (t.proyectoNombre != null ||
                          t.responsableNombre != null) ...[
                        const SizedBox(height: 3),
                        Wrap(
                          spacing: 4,
                          runSpacing: 2,
                          children: [
                            if (t.proyectoNombre != null)
                              Text(
                                t.proyectoNombre!,
                                style: const TextStyle(
                                    fontSize: 11, color: Color(0xFF94A3B8)),
                              ),
                            if (t.responsableNombre != null)
                              Text(
                                '• Asig: ${t.responsableNombre!.split(' ').take(2).join(' ')}',
                                style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF7C3AED),
                                    fontWeight: FontWeight.w600),
                              ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ============================================================
// PROGRESS HEADER (Estilo React: dark gradient bar)
// ============================================================

class _ProgressHeader extends StatelessWidget {
  final int done;
  final int total;
  final int percent;

  const _ProgressHeader({
    required this.done,
    required this.total,
    required this.percent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E293B), Color(0xFF334155)],
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E293B).withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Circular progress
          SizedBox(
            width: 48,
            height: 48,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: total > 0 ? done / total : 0,
                  strokeWidth: 4,
                  backgroundColor: Colors.white12,
                  valueColor: AlwaysStoppedAnimation(
                    percent >= 100
                        ? const Color(0xFF10B981)
                        : const Color(0xFF60A5FA),
                  ),
                ),
                Text(
                  '$percent%',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                    fontFamily: 'Inter',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),

          // Text
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Tu Plan de Hoy',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    fontFamily: 'Inter',
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$done de $total tareas completadas',
                  style: const TextStyle(
                    color: Colors.white54,
                    fontSize: 12,
                    fontFamily: 'Inter',
                  ),
                ),
              ],
            ),
          ),

          // Edit button
          IconButton(
            onPressed: () {
              HapticFeedback.mediumImpact();
              context.read<AgendaController>().reopenPlanning();
            },
            icon: const Icon(Icons.edit_note_rounded, color: Colors.white70),
            tooltip: 'Modificar Plan',
          ),
        ],
      ),
    );
  }
}

// ============================================================
// EXECUTION SECTION (Focus / Others)
// ============================================================

class _ExecutionSection extends StatelessWidget {
  final String title;
  final Color accentColor;
  final Color headerBg;
  final Color borderColor;
  final List<CheckinTarea> tasks;
  final AgendaController controller;
  final bool isMain;

  const _ExecutionSection({
    required this.title,
    required this.accentColor,
    required this.headerBg,
    required this.borderColor,
    required this.tasks,
    required this.controller,
    required this.isMain,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: headerBg,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(13)),
              border: Border(bottom: BorderSide(color: borderColor)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: accentColor,
                      letterSpacing: 1.0,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: accentColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${tasks.where((t) => t.tarea != null).length}',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: accentColor,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Tasks
          Padding(
            padding: const EdgeInsets.all(6),
            child: Column(
              children: tasks
                  .where((t) => t.tarea != null)
                  .map((t) => _ExecutionTaskRow(
                        task: t.tarea!,
                        isMain: isMain,
                        onToggle: () => controller.completeTask(t.idTarea),
                      ))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// EXECUTION TASK ROW (Post-Checkin, toggleable)
// ============================================================

class _ExecutionTaskRow extends StatefulWidget {
  final Tarea task;
  final bool isMain;
  final Future<void> Function() onToggle;

  const _ExecutionTaskRow({
    required this.task,
    required this.isMain,
    required this.onToggle,
  });

  @override
  State<_ExecutionTaskRow> createState() => _ExecutionTaskRowState();
}

class _ExecutionTaskRowState extends State<_ExecutionTaskRow> {
  bool _isLoading = false;

  Future<void> _handleComplete() async {
    if (_isLoading) return;

    setState(() => _isLoading = true);
    HapticFeedback.mediumImpact();

    // Feedback inmediato
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Completando tarea...'),
        duration: Duration(milliseconds: 1500),
        behavior: SnackBarBehavior.floating,
      ),
    );

    try {
      await widget.onToggle();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error: No se pudo completar. Verifique conexión.'),
            backgroundColor: MomentusTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDone = widget.task.estado == 'Hecha';
    final isBlocked = widget.task.estado == 'Bloqueada';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isDone ? const Color(0xFFF8FAFC) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDone
              ? const Color(0xFFE2E8F0)
              : (widget.isMain
                  ? const Color(0xFFFFE4E6)
                  : const Color(0xFFF1F5F9)),
        ),
        boxShadow: widget.isMain && !isDone
            ? [
                BoxShadow(
                  color: const Color(0xFFF43F5E).withValues(alpha: 0.05),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                )
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            // Aquí podríamos abrir detalles en el futuro
            // Por ahora solo feedback táctil suave
            HapticFeedback.lightImpact();
          },
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(
              children: [
                // ── CHECKBOX AREA (Area táctil aumentada) ──
                InkWell(
                  onTap: isBlocked ? null : _handleComplete,
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.all(4.0),
                    child: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: MomentusTheme.primary,
                            ),
                          )
                        : AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: isDone
                                  ? const Color(0xFF10B981)
                                  : (widget.isMain
                                      ? const Color(0xFFFFF1F2)
                                      : Colors.transparent),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isDone
                                    ? const Color(0xFF10B981)
                                    : (widget.isMain
                                        ? const Color(0xFFFDA4AF)
                                        : const Color(0xFFCBD5E1)),
                                width: 2,
                              ),
                            ),
                            child: isDone
                                ? const Icon(Icons.check_rounded,
                                    size: 16, color: Colors.white)
                                : null,
                          ),
                  ),
                ),
                const SizedBox(width: 12),

                // ── TASK CONTENT ──
                Expanded(
                  child: Opacity(
                    opacity: isDone ? 0.6 : 1.0,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.task.titulo,
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 14,
                            fontWeight: widget.isMain
                                ? FontWeight.w600
                                : FontWeight.w500,
                            color: isDone
                                ? const Color(0xFF94A3B8)
                                : const Color(0xFF1E293B),
                            decoration:
                                isDone ? TextDecoration.lineThrough : null,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (widget.task.proyectoNombre != null ||
                            widget.task.responsableNombre != null) ...[
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Icon(
                                widget.isMain
                                    ? Icons.adjust
                                    : Icons.work_outline_rounded,
                                size: 10,
                                color: isDone
                                    ? const Color(0xFFCBD5E1)
                                    : (widget.isMain
                                        ? const Color(0xFFFDA4AF)
                                        : const Color(0xFF94A3B8)),
                              ),
                              const SizedBox(width: 4),
                              if (widget.task.proyectoNombre != null)
                                Flexible(
                                  child: Text(
                                    widget.task.proyectoNombre!,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                      color: isDone
                                          ? const Color(0xFFCBD5E1)
                                          : const Color(0xFF64748B),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              if (widget.task.proyectoNombre != null &&
                                  widget.task.responsableNombre != null)
                                Text(
                                  ' • ',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDone
                                        ? const Color(0xFFCBD5E1)
                                        : const Color(0xFFCBD5E1),
                                  ),
                                ),
                              if (widget.task.responsableNombre != null)
                                Text(
                                  'Asig: ${widget.task.responsableNombre!.split(' ').take(2).join(' ')}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: isDone
                                        ? const Color(0xFFCBD5E1)
                                        : const Color(0xFF7C3AED),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ),

                // ── BLOQUEADO INDICATOR ──
                if (isBlocked)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFFECACA)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.lock_outline_rounded,
                            size: 12, color: Color(0xFFDC2626)),
                        SizedBox(width: 4),
                        Text(
                          'Bloqueada',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFDC2626),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ============================================================
// SHARED WIDGETS
// ============================================================

class _EmptySection extends StatelessWidget {
  final String message;
  const _EmptySection(this.message);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      width: double.infinity,
      child: Column(
        children: [
          const Icon(Icons.inbox_outlined, size: 40, color: Color(0xFFE2E8F0)),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;
  const _ErrorState({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Color(0xFFCBD5E1)),
            const SizedBox(height: 16),
            Text(error,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF64748B))),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}
