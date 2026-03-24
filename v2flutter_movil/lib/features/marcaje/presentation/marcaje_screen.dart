import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../campo/services/gps_service.dart';
import 'marcaje_controller.dart';

/// Pantalla de Marcaje Premium — Entrada/Salida + Extra + Compensada + GPS.
///
/// Funcionalidades sincronizadas con React (AttendanceManager.tsx):
///   • Reloj en vivo con fecha
///   • Tabs: Jornada | Horas Extra | Compensadas
///   • Timer HH:MM:SS en vivo desde último check-in
///   • Stale Shift Dialog (>20h sin salida)
///   • Solicitar Corrección
///   • Botón de Grabar Recorrido GPS
///   • Historial del día con badges de color
///   • Deshacer última salida
class MarcajeScreen extends StatefulWidget {
  const MarcajeScreen({super.key});

  @override
  State<MarcajeScreen> createState() => _MarcajeScreenState();
}

class _MarcajeScreenState extends State<MarcajeScreen>
    with SingleTickerProviderStateMixin {
  Timer? _clockTimer;
  String _horaActual = '';
  bool _grabandoRecorrido = false;
  late AnimationController _pulseCtrl;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _actualizarReloj();
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      _actualizarReloj();
      context.read<MarcajeController>().actualizarCronometro();
    });
    _grabandoRecorrido = GpsService.isTracking;

    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 1.0, end: 1.06).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MarcajeController>().init();
    });
  }

  void _actualizarReloj() {
    if (!mounted) return;
    setState(() {
      _horaActual = DateFormat('hh:mm:ss a').format(DateTime.now());
    });
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MarcajeController>(
      builder: (context, ctrl, _) {
        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFC),
          appBar: AppBar(
            title: const Text(
              'Marcaje de Asistencia',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            centerTitle: true,
            elevation: 0,
            backgroundColor: Colors.white,
            foregroundColor: const Color(0xFF1E293B),
          ),
          body: ctrl.cargando && ctrl.historial.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: () => ctrl.init(),
                  child: ListView(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 16),
                    children: [
                      // ── RELOJ + FECHA ──
                      _buildReloj(),
                      const SizedBox(height: 16),

                      // ── TABS: Jornada | Extra | Compensada ──
                      _buildTabs(ctrl),
                      const SizedBox(height: 16),

                      // ── TIMER EN VIVO ──
                      _buildTimerCard(ctrl),
                      const SizedBox(height: 20),

                      // ── BOTÓN PRINCIPAL ──
                      _buildBotonPrincipal(ctrl),
                      const SizedBox(height: 12),

                      // ── BOTÓN RECORRIDO GPS ──
                      _buildBotonRecorrido(ctrl),
                      const SizedBox(height: 8),

                      // ── ACCIONES SECUNDARIAS ──
                      _buildAccionesSecundarias(ctrl),

                      // ── ERROR ──
                      if (ctrl.error != null) ...[
                        const SizedBox(height: 12),
                        _buildError(ctrl),
                      ],

                      // ── HISTORIAL ──
                      const SizedBox(height: 20),
                      _buildHistorial(ctrl),
                    ],
                  ),
                ),
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════
  // RELOJ
  // ═══════════════════════════════════════════════════
  Widget _buildReloj() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E293B), Color(0xFF334155)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E293B).withValues(alpha: 0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            _horaActual,
            style: const TextStyle(
              fontSize: 44,
              fontWeight: FontWeight.w800,
              fontFamily: 'monospace',
              color: Colors.white,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            DateFormat('EEEE, d MMMM yyyy', 'es').format(DateTime.now()),
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withValues(alpha: 0.7),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  // TABS (Jornada | Horas Extra | Compensadas)
  // ═══════════════════════════════════════════════════
  Widget _buildTabs(MarcajeController ctrl) {
    final tabs = [
      {'id': 'normal', 'label': 'Jornada', 'icon': Icons.work_outline},
      {'id': 'extra', 'label': 'Hrs Extra', 'icon': Icons.more_time},
      {
        'id': 'compensada',
        'label': 'Compensadas',
        'icon': Icons.swap_horiz_rounded
      },
    ];

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: tabs.map((tab) {
          final isActive = ctrl.activeTab == tab['id'];
          return Expanded(
            child: GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                ctrl.changeTab(tab['id'] as String);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: isActive ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: isActive
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          )
                        ]
                      : null,
                ),
                child: Column(
                  children: [
                    Icon(
                      tab['icon'] as IconData,
                      size: 18,
                      color: isActive
                          ? const Color(0xFF1E293B)
                          : const Color(0xFF94A3B8),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      tab['label'] as String,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight:
                            isActive ? FontWeight.w700 : FontWeight.w500,
                        color: isActive
                            ? const Color(0xFF1E293B)
                            : const Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  // TIMER CARD (HH:MM:SS en vivo)
  // ═══════════════════════════════════════════════════
  Widget _buildTimerCard(MarcajeController ctrl) {
    final isActive = ctrl.isActiveForTab;
    final since = ctrl.sinceForTab;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isActive
              ? [const Color(0xFFF0FDF4), const Color(0xFFDCFCE7)]
              : [const Color(0xFFF8FAFC), const Color(0xFFF1F5F9)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isActive ? const Color(0xFF86EFAC) : const Color(0xFFE2E8F0),
          width: 2,
        ),
      ),
      child: Column(
        children: [
          Text(
            isActive ? '⏱ Tiempo en curso' : '⏸ Sin turno activo',
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isActive ? ctrl.tiempoFormateado : '00:00:00',
            style: TextStyle(
              fontSize: 48,
              fontFamily: 'monospace',
              fontWeight: FontWeight.w800,
              letterSpacing: 3,
              color:
                  isActive ? const Color(0xFF4F46E5) : const Color(0xFFCBD5E1),
            ),
          ),
          if (isActive && since != null) ...[
            const SizedBox(height: 8),
            Text(
              'Desde ${_formatHora(since)}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
            ),
          ],
          if (_grabandoRecorrido) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.fiber_manual_record,
                      color: Colors.white, size: 10),
                  SizedBox(width: 4),
                  Text('GPS Activo',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  // BOTÓN PRINCIPAL
  // ═══════════════════════════════════════════════════
  Widget _buildBotonPrincipal(MarcajeController ctrl) {
    final isActive = ctrl.isActiveForTab;

    // Labels según tab
    String enterLabel, exitLabel;
    if (ctrl.activeTab == 'extra') {
      enterLabel = 'INICIAR HORAS EXTRA';
      exitLabel = 'FINALIZAR HORAS EXTRA';
    } else if (ctrl.activeTab == 'compensada') {
      enterLabel = 'INICIAR COMPENSADAS';
      exitLabel = 'FINALIZAR COMPENSADAS';
    } else {
      enterLabel = 'MARCAR ENTRADA';
      exitLabel = 'MARCAR SALIDA';
    }

    return AnimatedBuilder(
      animation: _pulseAnim,
      builder: (context, child) {
        return Transform.scale(
          scale:
              !isActive && ctrl.activeTab == 'normal' ? _pulseAnim.value : 1.0,
          child: SizedBox(
            width: double.infinity,
            height: 80,
            child: ElevatedButton(
              onPressed: ctrl.cargando
                  ? null
                  : () async {
                      HapticFeedback.mediumImpact();

                      // Stale Shift check (solo para Entrada normal)
                      if (!isActive &&
                          ctrl.activeTab == 'normal' &&
                          ctrl.staleShift) {
                        _showStaleShiftDialog(ctrl);
                        return;
                      }

                      final messenger = ScaffoldMessenger.of(context);
                      final ok = await ctrl.marcarSegunTab();
                      if (ok) {
                        messenger.showSnackBar(
                          SnackBar(
                            content: Text(isActive
                                ? '✅ Salida registrada correctamente'
                                : '✅ Entrada registrada correctamente'),
                            backgroundColor: Colors.green.shade700,
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                          ),
                        );
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: isActive
                    ? const Color(0xFFDC2626)
                    : const Color(0xFF16A34A),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20)),
                elevation: 6,
                shadowColor: (isActive
                        ? const Color(0xFFDC2626)
                        : const Color(0xFF16A34A))
                    .withValues(alpha: 0.4),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isActive ? Icons.logout : Icons.login,
                    color: Colors.white,
                    size: 30,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isActive ? exitLabel : enterLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                      letterSpacing: 0.5,
                    ),
                  ),
                  if (isActive)
                    Text(
                      '⏱️ ${ctrl.tiempoFormateado}',
                      style:
                          const TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════
  // STALE SHIFT DIALOG
  // ═══════════════════════════════════════════════════
  void _showStaleShiftDialog(MarcajeController ctrl) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626)),
            SizedBox(width: 8),
            Text('Turno Anterior Abierto',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          ],
        ),
        content: const Text(
          'Tu último turno lleva más de 20 horas abierto sin salida.\n\n'
          'Al continuar, se registrará una nueva entrada. '
          'Puedes solicitar una corrección después.',
          style: TextStyle(fontSize: 14, color: Color(0xFF64748B), height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('CANCELAR'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await ctrl.marcarSegunTab();
              if (ok && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('✅ Entrada registrada'),
                    backgroundColor: Colors.green.shade700,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
            ),
            child:
                const Text('CONTINUAR', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  // CORRECTION DIALOG
  // ═══════════════════════════════════════════════════
  void _showCorrectionDialog(MarcajeController ctrl) {
    final motivoCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.edit_note, color: Color(0xFF4F46E5)),
            SizedBox(width: 8),
            Text('Solicitar Corrección',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          ],
        ),
        content: TextField(
          controller: motivoCtrl,
          decoration: const InputDecoration(
            hintText: 'Describe el motivo de la corrección...',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('CANCELAR'),
          ),
          ElevatedButton(
            onPressed: () async {
              final motivo = motivoCtrl.text.trim();
              if (motivo.isEmpty) return;
              Navigator.pop(ctx);
              final ok = await ctrl.solicitarCorreccion(motivo);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(ok
                        ? '📨 Solicitud de corrección enviada'
                        : '❌ Error al enviar solicitud'),
                    backgroundColor:
                        ok ? Colors.green.shade700 : Colors.red.shade700,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4F46E5),
            ),
            child: const Text('ENVIAR', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  // BOTÓN GRABAR RECORRIDO GPS
  // ═══════════════════════════════════════════════════
  Widget _buildBotonRecorrido(MarcajeController ctrl) {
    if (!ctrl.isActiveForTab) return const SizedBox.shrink();

    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton.icon(
        onPressed: () async {
          HapticFeedback.lightImpact();
          if (_grabandoRecorrido) {
            GpsService.detenerTracking();
            setState(() => _grabandoRecorrido = false);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('📍 Grabación de recorrido detenida'),
                  backgroundColor: Colors.orange.shade700,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              );
            }
          } else {
            final permisos = await GpsService.solicitarPermisos();
            if (!permisos) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text(
                        '❌ Se necesitan permisos de ubicación para grabar recorrido'),
                    backgroundColor: Colors.red.shade700,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
              return;
            }
            await GpsService.iniciarTracking();
            setState(() => _grabandoRecorrido = true);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text(
                      '📍 Grabando recorrido GPS cada 30 segundos...'),
                  backgroundColor: Colors.green.shade700,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              );
            }
          }
        },
        icon: Icon(
          _grabandoRecorrido ? Icons.stop_circle : Icons.route,
          color: Colors.white,
        ),
        label: Text(
          _grabandoRecorrido
              ? 'DETENER GRABACIÓN DE RECORRIDO'
              : '📍 GRABAR RECORRIDO GPS',
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            color: Colors.white,
            fontSize: 14,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: _grabandoRecorrido
              ? Colors.orange.shade700
              : const Color(0xFF4F46E5),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          elevation: 2,
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  // ACCIONES SECUNDARIAS
  // ═══════════════════════════════════════════════════
  Widget _buildAccionesSecundarias(MarcajeController ctrl) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () async {
              final ok = await ctrl.deshacerUltimo();
              if (ok && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('↩️ Último registro deshecho'),
                    backgroundColor: Colors.blue.shade700,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            icon: const Icon(Icons.undo, size: 18),
            label: const Text('Deshacer'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _showCorrectionDialog(ctrl),
            icon: const Icon(Icons.edit_note, size: 18),
            label: const Text('Corrección'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════
  // ERROR
  // ═══════════════════════════════════════════════════
  Widget _buildError(MarcajeController ctrl) {
    return GestureDetector(
      onTap: () => ctrl.clearError(),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.red.shade200),
        ),
        child: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                ctrl.error!,
                style: TextStyle(color: Colors.red.shade700, fontSize: 14),
              ),
            ),
            Icon(Icons.close, color: Colors.red.shade300, size: 18),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  // HISTORIAL DEL DÍA
  // ═══════════════════════════════════════════════════
  Widget _buildHistorial(MarcajeController ctrl) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
              border: Border(
                bottom: BorderSide(color: Colors.grey.shade200),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.history, size: 18, color: Color(0xFF64748B)),
                const SizedBox(width: 8),
                const Text(
                  'Historial de Hoy',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    color: Color(0xFF334155),
                  ),
                ),
                const Spacer(),
                Text(
                  '${ctrl.historial.length} registro(s)',
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                ),
              ],
            ),
          ),
          // Items
          if (ctrl.historial.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Icon(Icons.inbox_outlined,
                      size: 40, color: Colors.grey.shade300),
                  const SizedBox(height: 8),
                  Text(
                    'Sin registros hoy',
                    style: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                  ),
                ],
              ),
            )
          else
            ...ctrl.historial.asMap().entries.map((entry) {
              final h = entry.value;
              final tipo = h['tipo_marcaje']?.toString() ?? '';
              final fecha = h['fecha']?.toString() ?? '';
              final motivo = h['motivo']?.toString();
              final device = h['tipo_device']?.toString();

              final isEntrada =
                  tipo.contains('ENTRADA') || tipo.contains('INICIO');

              // Color según tipo
              Color iconBg, iconColor;
              if (tipo.contains('EXTRA')) {
                iconBg = Colors.blue.shade50;
                iconColor = Colors.blue.shade700;
              } else if (tipo.contains('COMPENSADA')) {
                iconBg = Colors.amber.shade50;
                iconColor = Colors.amber.shade700;
              } else if (isEntrada) {
                iconBg = Colors.green.shade50;
                iconColor = Colors.green.shade700;
              } else {
                iconBg = Colors.red.shade50;
                iconColor = Colors.red.shade700;
              }

              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Colors.grey.shade100),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: iconBg,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isEntrada ? Icons.login : Icons.logout,
                        color: iconColor,
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _formatTipo(tipo),
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                          if (motivo != null)
                            Text(
                              '⚠️ ${motivo.split("|").length} aviso(s)',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.amber.shade700,
                              ),
                            ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          _formatHora(fecha),
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        Text(
                          device == 'MOBILE' ? '📱 Móvil' : '🖥️ Web',
                          style: TextStyle(
                              fontSize: 11, color: Colors.grey.shade500),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════
  String _formatHora(String? iso) {
    if (iso == null || iso.isEmpty) return '--:--';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return DateFormat('hh:mm a').format(dt);
  }

  String _formatTipo(String tipo) {
    const map = {
      'ENTRADA': '🟢 Entrada',
      'SALIDA': '🔴 Salida',
      'INICIO_EXTRA': '🔵 Inicio Extra',
      'FIN_EXTRA': '⏹ Fin Extra',
      'INICIO_COMPENSADA': '🟡 Inicio Compensada',
      'FIN_COMPENSADA': '⏹ Fin Compensada',
    };
    return map[tipo] ?? tipo;
  }
}
