import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../tasks/data/local/local_database.dart';
import '../../tasks/presentation/task_controller.dart';
import '../../home/presentation/home_shell.dart';
import '../../../core/theme/app_theme.dart';

class SyncScreen extends StatefulWidget {
  const SyncScreen({super.key});

  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<SyncScreen>
    with SingleTickerProviderStateMixin {
  String lastCacheUpdate = '-';
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _loadMeta();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _loadMeta() async {
    final db = await LocalDatabase.instance.database;
    final rows = await db
        .rawQuery('SELECT MAX(updated_at) AS max_updated FROM kv_cache');
    final value = rows.first['max_updated']?.toString() ?? '-';
    if (!mounted) return;
    setState(() => lastCacheUpdate = value);
  }

  String _formatDate(DateTime? value) {
    if (value == null) return 'Nunca';
    final now = DateTime.now();
    final diff = now.difference(value);

    if (diff.inSeconds < 60) return 'Hace un momento';
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Hace ${diff.inHours} horas';

    return DateFormat('dd/MM HH:mm').format(value);
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<TaskController>();
    final unsynced = controller.unsyncedCount;
    final isSyncing = controller.loading;
    final hasError = controller.lastSyncError != null;

    Color statusColor;
    IconData statusIcon;
    String statusText;
    String statusSub;

    if (isSyncing) {
      statusColor = const Color(0xFF3B82F6); // Blue
      statusIcon = CupertinoIcons.arrow_2_circlepath;
      statusText = 'Sincronizando...';
      statusSub = 'Actualizando datos con el servidor';
    } else if (hasError) {
      statusColor = const Color(0xFFEF4444); // Red
      statusIcon = CupertinoIcons.exclamationmark_circle;
      statusText = 'Error de Sincronización';
      statusSub = 'Verifica tu conexión a internet';
    } else if (unsynced > 0) {
      statusColor = const Color(0xFFF59E0B); // Amber
      statusIcon = CupertinoIcons.cloud_upload;
      statusText = 'Cambios Pendientes';
      statusSub = 'Tienes $unsynced elementos por subir';
    } else {
      statusColor = const Color(0xFF10B981); // Emerald
      statusIcon = CupertinoIcons.check_mark_circled;
      statusText = 'Todo Sincronizado';
      statusSub = 'Tus datos están al día';
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const MomentusAppBar(
        title: 'Sincronización',
        subtitle: 'Estado de conexión y datos',
        showBack: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Status Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: statusColor.withValues(alpha: 0.1),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
                border: Border.all(color: const Color(0xFFF1F5F9)),
              ),
              child: Column(
                children: [
                  ScaleTransition(
                    scale: isSyncing
                        ? _pulseAnimation
                        : const AlwaysStoppedAnimation(1.0),
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(statusIcon, color: statusColor, size: 40),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    statusText,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    statusSub,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 14,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Sync Button
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: isSyncing
                          ? null
                          : () async {
                              await controller.syncNow();
                              await _loadMeta();
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: MomentusTheme.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: isSyncing
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2),
                            )
                          : const Text(
                              'Sincronizar Ahora',
                              style: TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Metrics Grid
            Row(
              children: [
                Expanded(
                  child: _MetricCard(
                    label: 'Pendientes',
                    value: '$unsynced',
                    icon: CupertinoIcons.tray_arrow_up,
                    color: const Color(0xFFF59E0B),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _MetricCard(
                    label: 'Locales',
                    value: '${controller.tasks.length}',
                    icon: CupertinoIcons.doc_on_doc,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Info Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFF1F5F9)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'DETALLES TÉCNICOS',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF94A3B8),
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _DetailRow(
                    label: 'Última sincronización',
                    value: _formatDate(controller.lastSyncAt),
                  ),
                  const Divider(height: 24, color: Color(0xFFF1F5F9)),
                  _DetailRow(
                    label: 'Caché actualizado',
                    value: lastCacheUpdate != '-'
                        ? (DateTime.tryParse(lastCacheUpdate) != null
                            ? _formatDate(DateTime.tryParse(lastCacheUpdate))
                            : lastCacheUpdate)
                        : 'Nunca',
                  ),
                  const Divider(height: 24, color: Color(0xFFF1F5F9)),
                  const _DetailRow(
                    label: 'Estrategia',
                    value: 'Write-local-first',
                  ),
                  if (hasError) ...[
                    const Divider(height: 24, color: Color(0xFFF1F5F9)),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline,
                              size: 16, color: Color(0xFFEF4444)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              controller.lastSyncError ?? 'Error desconocido',
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFFB91C1C),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 13,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 14,
            color: Color(0xFF64748B),
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }
}
