import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/config/app_config.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/auth_controller.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/home/presentation/home_shell.dart';
import 'features/tasks/presentation/task_controller.dart';
class MomentusMobileApp extends StatelessWidget {
  const MomentusMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthController()..initialize()),
        ChangeNotifierProvider(create: (_) => TaskController()..loadTasks()),
      ],
      child: MaterialApp(
        title: 'Momentus Mobile',
        debugShowCheckedModeBanner: false,
        theme: MomentusTheme.theme, // Solo modo claro
        home: const _AppRoot(),
      ),
    );
  }
}

class _AppRoot extends StatefulWidget {
  const _AppRoot();

  @override
  State<_AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<_AppRoot> with WidgetsBindingObserver {
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  Timer? _syncDebounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _listenConnectivityChanges();
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    _syncDebounce?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _scheduleSync();
    }
  }

  void _listenConnectivityChanges() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((
      results,
    ) {
      final hasNetwork = results.any(
        (result) => result != ConnectivityResult.none,
      );
      if (hasNetwork) {
        _scheduleSync();
      }
    });
  }

  void _scheduleSync() {
    _syncDebounce?.cancel();
    _syncDebounce = Timer(AppConfig.syncWindow, () {
      if (!mounted) return;
      final auth = context.read<AuthController>();
      if (!auth.isAuthenticated) return;
      context.read<TaskController>().syncNow();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();

    if (!auth.initialized || auth.loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return auth.isAuthenticated ? const HomeShell() : const LoginScreen();
  }
}
