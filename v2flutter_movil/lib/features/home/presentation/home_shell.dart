import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:flutter/cupertino.dart';

import '../../agenda/presentation/agenda_screen.dart';
import '../../agenda/presentation/calendar_full_screen.dart';
import '../../assignment/presentation/my_assignment_screen.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../campo/presentation/campo_screen.dart';
import '../../campo/presentation/campo_controller.dart';
import '../../marcaje/presentation/marcaje_screen.dart';
import '../../marcaje/presentation/marcaje_controller.dart';
import '../../notes/presentation/notes_screen.dart';
import '../../pending/presentation/pending_screen.dart';
import '../../projects/presentation/projects_screen.dart';
import '../../reports/presentation/reports_screen.dart';
import '../../settings/presentation/settings_screen.dart';
import '../../sync/presentation/sync_screen.dart';
import '../../team/presentation/team_screen.dart';
import '../../team/presentation/agenda_compliance_screen.dart';
import '../../tasks/presentation/quick_create_task_sheet.dart';
import '../../tasks/presentation/task_controller.dart';
import '../../admin/screens/inactivity_report_screen.dart';
import '../../../core/theme/app_theme.dart';

/// ============================================
/// HOME SHELL - Navegación Principal Premium
/// ============================================
/// Estructura moderna sin Drawer, usando NavigationBar M3
/// y menú de perfil contextual.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  static final GlobalKey<ScaffoldState> scaffoldKey =
      GlobalKey<ScaffoldState>();

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _currentIndex = 0;

  // Pantallas principales accesibles desde BottomNav
  final List<Widget> _screens = const [
    AgendaScreen(), // Hoy / Agenda
    PendingScreen(), // Pendientes
    ProjectsScreen(), // Proyectos
    TeamScreen(), // Equipo
    ReportsScreen(), // Dashboard
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: HomeShell.scaffoldKey,
      backgroundColor: const Color(0xFFF8FAFC),
      // Restauramos el Drawer para opciones extendidas
      drawer: _buildModernDrawer(context),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        switchInCurve: Curves.easeOut,
        switchOutCurve: Curves.easeIn,
        child: KeyedSubtree(
          key: ValueKey(_currentIndex),
          child: _screens[_currentIndex],
        ),
      ),
      bottomNavigationBar: _buildModernNavBar(context),
      floatingActionButton: (_currentIndex == 0 || _currentIndex == 1)
          ? FloatingActionButton(
              onPressed: () => _showQuickCreateTask(context),
              child: const Icon(CupertinoIcons.add, color: Colors.white),
            )
          : null,
    );
  }

  void _showQuickCreateTask(BuildContext context) {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const Padding(
        padding: EdgeInsets.only(top: 100),
        child: QuickCreateTaskSheet(),
      ),
    );
  }

  Widget _buildModernDrawer(BuildContext context) {
    final auth = context.watch<AuthController>();
    final user = auth.user;

    return Drawer(
      backgroundColor: Colors.white,
      child: Column(
        children: [
          // Header con Gradiente Premium
          Container(
            padding: const EdgeInsets.fromLTRB(20, 60, 20, 30),
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: MomentusTheme.heroGradient,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.3),
                      width: 2,
                    ),
                  ),
                  child: CircleAvatar(
                    radius: 30,
                    backgroundColor: MomentusTheme.red50,
                    child: Text(
                      user?.nombre.isNotEmpty == true ? user!.nombre[0] : 'U',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: MomentusTheme.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  user?.nombre ?? 'Usuario',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  user?.correo ?? '',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.7),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),

          // Lista de Opciones
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
              children: [
                _drawerGroupHeader('PRINCIPAL'),
                _drawerItem(
                  icon: CupertinoIcons.calendar,
                  label: 'Mi Agenda',
                  selected: _currentIndex == 0,
                  onTap: () {
                    setState(() => _currentIndex = 0);
                    Navigator.pop(context);
                  },
                ),
                _drawerItem(
                  icon: CupertinoIcons.calendar_circle,
                  label: 'Calendario Completo',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const CalendarFullScreen(),
                      ),
                    );
                  },
                ),
                _drawerItem(
                  icon: CupertinoIcons.person_crop_circle_badge_checkmark,
                  label: 'Mi Asignación',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const MyAssignmentScreen()));
                  },
                ),
                _drawerItem(
                  icon: CupertinoIcons.check_mark_circled,
                  label: 'Tareas Pendientes',
                  selected: _currentIndex == 1,
                  onTap: () {
                    setState(() => _currentIndex = 1);
                    Navigator.pop(context);
                  },
                ),
                _drawerItem(
                  icon: CupertinoIcons.folder,
                  label: 'Proyectos',
                  selected: _currentIndex == 2,
                  onTap: () {
                    setState(() => _currentIndex = 2);
                    Navigator.pop(context);
                  },
                ),
                _drawerItem(
                  icon: CupertinoIcons.group,
                  label: 'Mi Equipo',
                  selected: _currentIndex == 3,
                  onTap: () {
                    setState(() => _currentIndex = 3);
                    Navigator.pop(context);
                  },
                ),
                _drawerItem(
                  icon: CupertinoIcons.list_bullet_below_rectangle,
                  label: 'Seguimiento Agenda',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const AgendaComplianceScreen(),
                      ),
                    );
                  },
                ),
                _drawerItem(
                  icon: CupertinoIcons.chart_bar,
                  label: 'Reportes y KPIs',
                  selected: _currentIndex == 4,
                  onTap: () {
                    setState(() => _currentIndex = 4);
                    Navigator.pop(context);
                  },
                ),
                // ── SECCIÓN CAMPO (solo para testing: gustavo.lira) ──
                if (user?.correo == 'gustavo.lira@claro.com.ni') ...[
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Divider(height: 1),
                  ),
                  _drawerGroupHeader('CAMPO'),
                  _drawerItem(
                    icon: Icons.map,
                    label: 'Mi Ruta de Hoy',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ChangeNotifierProvider(
                            create: (_) => CampoController(),
                            child: const CampoScreen(),
                          ),
                        ),
                      );
                    },
                  ),
                  _drawerItem(
                    icon: Icons.access_time,
                    label: 'Marcaje',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ChangeNotifierProvider(
                            create: (_) => MarcajeController(),
                            child: const MarcajeScreen(),
                          ),
                        ),
                      );
                    },
                  ),
                ],
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Divider(height: 1),
                ),
                _drawerGroupHeader('HERRAMIENTAS'),
                _drawerItem(
                  icon: CupertinoIcons.doc_text,
                  label: 'Mis Notas',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const NotesScreen()));
                  },
                ),
                _drawerItem(
                  icon: CupertinoIcons.arrow_2_circlepath,
                  label: 'Sincronizar',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const SyncScreen()));
                  },
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Divider(height: 1),
                ),
                _drawerGroupHeader('ADMINISTRACIÓN'),
                _drawerItem(
                  icon: CupertinoIcons.eye_solid,
                  label: 'Reporte Inactivos',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const InactivityReportScreen()));
                  },
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Divider(height: 1),
                ),
                _drawerGroupHeader('SISTEMA'),
                _drawerItem(
                  icon: CupertinoIcons.settings,
                  label: 'Configuración',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const SettingsScreen()));
                  },
                ),
                _drawerItem(
                  icon: CupertinoIcons.square_arrow_left,
                  label: 'Cerrar Sesión',
                  isDestructive: true,
                  onTap: () {
                    Navigator.pop(context);
                    auth.logout();
                  },
                ),
              ],
            ),
          ),

          // Versión al pie
          Padding(
            padding: const EdgeInsets.all(20),
            child: Text(
              'Versión 1.0.2',
              style: TextStyle(color: Colors.grey[400], fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _drawerGroupHeader(String label) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: Colors.grey[500],
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _drawerItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool selected = false,
    bool isDestructive = false,
  }) {
    final color = isDestructive
        ? const Color(0xFFEF4444)
        : (selected ? MomentusTheme.primary : const Color(0xFF334155));

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      child: ListTile(
        onTap: onTap,
        selected: selected,
        leading: Icon(icon, color: color, size: 22),
        title: Text(
          label,
          style: TextStyle(
            color: color,
            fontWeight: selected ? FontWeight.bold : FontWeight.w600,
            fontSize: 14,
          ),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        selectedTileColor: MomentusTheme.green50,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16),
        dense: true,
      ),
    );
  }

  Widget _buildModernNavBar(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Subtle accent line on top of navbar
        Container(
          height: 2,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                MomentusTheme.primary.withValues(alpha: 0.0),
                MomentusTheme.primary.withValues(alpha: 0.12),
                MomentusTheme.primary.withValues(alpha: 0.0),
              ],
            ),
          ),
        ),
        NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (index) {
            HapticFeedback.selectionClick();
            setState(() => _currentIndex = index);
          },
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          indicatorColor: MomentusTheme.red50,
          elevation: 0,
          height: 72,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: const [
            NavigationDestination(
              icon: Icon(CupertinoIcons.calendar),
              selectedIcon: Icon(CupertinoIcons.calendar_today,
                  color: MomentusTheme.primary),
              label: 'Mi Agenda',
            ),
            NavigationDestination(
              icon: Icon(CupertinoIcons.check_mark_circled),
              selectedIcon: Icon(CupertinoIcons.check_mark_circled_solid,
                  color: MomentusTheme.primary),
              label: 'Tareas',
            ),
            NavigationDestination(
              icon: Icon(CupertinoIcons.folder),
              selectedIcon: Icon(CupertinoIcons.folder_solid,
                  color: MomentusTheme.primary),
              label: 'Proyectos',
            ),
            NavigationDestination(
              icon: Icon(CupertinoIcons.group),
              selectedIcon: Icon(CupertinoIcons.group_solid,
                  color: MomentusTheme.primary),
              label: 'Equipo',
            ),
            NavigationDestination(
              icon: Icon(CupertinoIcons.chart_bar),
              selectedIcon: Icon(CupertinoIcons.chart_bar_fill,
                  color: MomentusTheme.primary),
              label: 'Reportes',
            ),
          ],
        ),
      ],
    );
  }
}

/// Widget reutilizable para el Header con Avatar
/// Reemplaza el AppBar tradicional en las pantallas principales
/// Implementa patrón "Mobile First" de Google (Avatar = Menu)
class MomentusAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final String? subtitle;
  final bool showBack;
  final List<Widget>? actions;
  final bool centerTitle;

  const MomentusAppBar({
    super.key,
    required this.title,
    this.subtitle,
    this.showBack = false,
    this.actions,
    this.centerTitle = false,
  });

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final user = auth.user;
    final initials =
        user?.nombre.isNotEmpty == true ? user!.nombre[0].toUpperCase() : 'U';

    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: centerTitle,
      automaticallyImplyLeading: false,
      leading: showBack
          ? IconButton(
              icon: const Icon(CupertinoIcons.back),
              onPressed: () => Navigator.pop(context),
            )
          : IconButton(
              icon:
                  const Icon(CupertinoIcons.bars), // Icono de menú hamburguesa
              onPressed: () {
                // Abre el drawer global (del HomeShell)
                HomeShell.scaffoldKey.currentState?.openDrawer();
              },
            ),
      title: Column(
        crossAxisAlignment:
            centerTitle ? CrossAxisAlignment.center : CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w800,
              fontSize: 20,
              color: Color(0xFF0F172A),
              letterSpacing: -0.5,
            ),
          ),
          if (subtitle != null)
            Text(
              subtitle!,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Color(0xFF64748B),
              ),
            ),
        ],
      ),
      actions: [
        if (actions != null) ...actions!,

        // Badge de Sync — muestra items pendientes de sincronizar
        Builder(
          builder: (ctx) {
            int unsyncedCount = 0;
            try {
              final taskCtrl = ctx.watch<TaskController>();
              unsyncedCount = taskCtrl.unsyncedCount;
            } catch (_) {
              // TaskController no disponible en este contexto
            }
            if (unsyncedCount > 0) {
              return Padding(
                padding: const EdgeInsets.only(right: 4),
                child: IconButton(
                  icon: Badge(
                    label: Text('$unsyncedCount',
                        style: const TextStyle(
                            fontSize: 9, fontWeight: FontWeight.w800)),
                    backgroundColor: const Color(0xFFEF4444),
                    child: const Icon(CupertinoIcons.cloud_upload,
                        size: 22, color: Color(0xFF64748B)),
                  ),
                  tooltip: '$unsyncedCount sin sincronizar',
                  onPressed: () {
                    Navigator.push(ctx,
                        MaterialPageRoute(builder: (_) => const SyncScreen()));
                  },
                ),
              );
            }
            return const SizedBox.shrink();
          },
        ),

        // Avatar de Perfil Interactiva - El nuevo "Menú"
        Padding(
          padding: const EdgeInsets.only(right: 16, left: 8),
          child: GestureDetector(
            onTap: () => _showProfileMenu(context, auth),
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: MomentusTheme.primary,
                shape: BoxShape.circle,
                border: Border.all(color: MomentusTheme.green100, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: MomentusTheme.primary.withValues(alpha: 0.2),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  initials,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _showProfileMenu(BuildContext context, AuthController auth) {
    HapticFeedback.mediumImpact();

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header User Info
            Row(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    color: MomentusTheme.red100,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      auth.user?.nombre.isNotEmpty == true
                          ? auth.user!.nombre[0]
                          : 'U',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: MomentusTheme.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        auth.user?.nombre ?? 'Usuario',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        auth.user?.correo ?? '',
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('🇳🇮 Managua',
                            style: TextStyle(
                                fontSize: 12, color: Color(0xFF64748B))),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),
            const Divider(height: 1),
            const SizedBox(height: 16),

            // Opciones de Menú (Estilo lista iOS)
            _ProfileMenuItem(
              icon: CupertinoIcons.settings,
              label: 'Configuración',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const SettingsScreen()));
              },
            ),
            _ProfileMenuItem(
              icon: CupertinoIcons.arrow_2_circlepath,
              label: 'Sincronizar Datos',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const SyncScreen()));
              },
            ),
            _ProfileMenuItem(
              icon: CupertinoIcons.doc_text,
              label: 'Mis Notas',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const NotesScreen()));
              },
            ),
            _ProfileMenuItem(
              icon: CupertinoIcons.person_crop_circle_badge_checkmark,
              label: 'Mi Asignación',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => const MyAssignmentScreen()));
              },
            ),

            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 16),

            _ProfileMenuItem(
              icon: CupertinoIcons.square_arrow_left,
              label: 'Cerrar Sesión',
              isDestructive: true,
              onTap: () {
                Navigator.pop(context);
                auth.logout();
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

class _ProfileMenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isDestructive;

  const _ProfileMenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final color =
        isDestructive ? const Color(0xFFEF4444) : const Color(0xFF334155);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDestructive
                      ? const Color(0xFFFEF2F2)
                      : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                    color: color,
                  ),
                ),
              ),
              const Icon(CupertinoIcons.chevron_right,
                  size: 16, color: Color(0xFFCBD5E1)),
            ],
          ),
        ),
      ),
    );
  }
}
