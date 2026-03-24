import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../data/agenda_repository.dart';
import '../../auth/data/auth_repository.dart';
import '../domain/agenda_models.dart';

class AgendaController extends ChangeNotifier {
  final AgendaRepository _repository;
  final AuthRepository _authRepository;

  AgendaController(
      {AgendaRepository? repository, AuthRepository? authRepository})
      : _repository = repository ?? AgendaRepository(),
        _authRepository = authRepository ?? AuthRepository();

  bool loading = false;
  String? error;
  AgendaResponse? data;
  bool isOffline = false;

  // Config de visibilidad (Desde DB con fallback local)
  bool showGestion = true;
  bool showRapida = true;

  // Fecha seleccionada
  DateTime currentDate = DateTime.now();

  // ── Local Config Cache Keys ──
  static const _kShowGestion = 'agenda_show_gestion';
  static const _kShowRapida = 'agenda_show_rapida';

  Future<void> loadAgenda([DateTime? date]) async {
    final targetDate = date ?? currentDate;
    currentDate = targetDate;

    final fechaStr =
        "${targetDate.year}-${targetDate.month.toString().padLeft(2, '0')}-${targetDate.day.toString().padLeft(2, '0')}";

    loading = true;
    error = null;
    notifyListeners();

    try {
      // 1. Cargar config local primero (instantáneo)
      await _loadLocalConfig();

      // 2. Cargar Configuración de Usuario (Servidor) + Agenda en Paralelo
      final configFuture = _authRepository.getUserConfig();
      final agendaFuture = _repository.getMiDia(fechaStr);

      final results = await Future.wait([configFuture, agendaFuture]);

      final config = results[0] as Map<String, dynamic>;
      showGestion = config['agendaShowGestion'] ?? showGestion;
      showRapida = config['agendaShowRapida'] ?? showRapida;

      // Guardar config en local para futura referencia
      await _saveLocalConfig();

      data = results[1] as AgendaResponse;
      isOffline = false;
    } catch (e) {
      error = 'Error al cargar agenda: $e';
      isOffline = true;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  // ── Local config helpers (SharedPreferences) ──

  Future<void> _loadLocalConfig() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (prefs.containsKey(_kShowGestion)) {
        showGestion = prefs.getBool(_kShowGestion) ?? true;
      }
      if (prefs.containsKey(_kShowRapida)) {
        showRapida = prefs.getBool(_kShowRapida) ?? true;
      }
    } catch (_) {
      // Si falla SharedPreferences, usar valores por defecto
    }
  }

  Future<void> _saveLocalConfig() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_kShowGestion, showGestion);
      await prefs.setBool(_kShowRapida, showRapida);
    } catch (_) {
      // No-op
    }
  }

  // Estado de Selección (Separado por categorías como en React)
  Set<int> selectedMainIds = {};
  Set<int> selectedGestionIds = {};
  Set<int> selectedRapidaIds = {};

  bool startDayLoading = false;

  void toggleTask(int id, String category) {
    if (category == 'MAIN') {
      if (selectedMainIds.contains(id)) {
        selectedMainIds.remove(id);
      } else {
        selectedMainIds.add(id);
        selectedGestionIds.remove(id);
        selectedRapidaIds.remove(id);
      }
    } else if (category == 'GESTION') {
      if (selectedGestionIds.contains(id)) {
        selectedGestionIds.remove(id);
      } else {
        selectedGestionIds.add(id);
        selectedMainIds.remove(id);
        selectedRapidaIds.remove(id);
      }
    } else if (category == 'RAPIDA') {
      if (selectedRapidaIds.contains(id)) {
        selectedRapidaIds.remove(id);
      } else {
        selectedRapidaIds.add(id);
        selectedMainIds.remove(id);
        selectedGestionIds.remove(id);
      }
    }
    notifyListeners();
  }

  Future<void> saveCheckin(int userId) async {
    if (selectedMainIds.isEmpty) {
      error = "Selecciona al menos una tarea Principal.";
      notifyListeners();
      return;
    }

    startDayLoading = true;
    notifyListeners();

    try {
      final fechaStr =
          "${currentDate.year}-${currentDate.month.toString().padLeft(2, '0')}-${currentDate.day.toString().padLeft(2, '0')}";

      // ✅ Generar texto representativo basado en tareas (Igual que en React)
      final allAvailable = [...?data?.tareasSugeridas, ...?data?.backlog];
      final entregoTitles = selectedMainIds
          .map((id) => allAvailable
              .firstWhere((t) => t.idTarea == id,
                  orElse: () => Tarea(
                      idTarea: 0,
                      titulo: '',
                      estado: '',
                      prioridad: '',
                      progreso: 0,
                      orden: 0,
                      diasAtraso: 0,
                      esAtrasada: false))
              .titulo)
          .where((t) => t.isNotEmpty)
          .join(' + ');

      String finalGoal =
          entregoTitles.isEmpty ? "Plan de Trabajo" : entregoTitles;
      if (finalGoal.length > 3900) {
        finalGoal = "${finalGoal.substring(0, 3900)}...";
      }

      final checkinPayload = {
        "idUsuario": userId,
        "fecha": fechaStr,
        "entregableTexto": finalGoal,
        "entrego": selectedMainIds.toList(),
        "avanzo": selectedGestionIds.toList(),
        "extras": selectedRapidaIds.toList(),
        "estadoAnimo": "Ok"
      };

      await _repository.saveCheckin(checkinPayload);
      await loadAgenda();

      selectedMainIds.clear();
      selectedGestionIds.clear();
      selectedRapidaIds.clear();
    } catch (e) {
      error = 'Error al guardar plan: $e';
    } finally {
      startDayLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateConfig({bool? gestion, bool? rapida}) async {
    if (gestion != null) showGestion = gestion;
    if (rapida != null) showRapida = rapida;
    notifyListeners();

    // Guardar localmente de inmediato (siempre funciona)
    await _saveLocalConfig();

    try {
      await _authRepository.updateUserConfig({
        'agendaShowGestion': showGestion,
        'agendaShowRapida': showRapida,
      });
    } catch (e) {
      // NO hacer rollback — la config local ya se guardó y prevalece
      // Solo loguear que el sync con servidor falló
      debugPrint('⚠️ Config sync failed, will retry next load: $e');
    }
  }

  Future<void> completeTask(int taskId) async {
    try {
      await _repository.completeTask(taskId);
      await loadAgenda();
    } catch (e) {
      error = "Error al completar tarea: $e";
      notifyListeners();
    }
  }

  Future<void> discardTask(int taskId) async {
    try {
      await _repository.discardTask(taskId);
      await loadAgenda();
    } catch (e) {
      error = "Error al descartar tarea: $e";
      notifyListeners();
    }
  }

  void nextDay() {
    loadAgenda(currentDate.add(const Duration(days: 1)));
  }

  void prevDay() {
    loadAgenda(currentDate.subtract(const Duration(days: 1)));
  }

  /// Permite volver al modo planificación re-poblando la selección actual
  void reopenPlanning() {
    if (data?.checkinHoy == null) return;

    final checkin = data!.checkinHoy!;
    selectedMainIds.clear();
    selectedGestionIds.clear();
    selectedRapidaIds.clear();

    for (var ct in checkin.tareas) {
      if (ct.tipo == 'Entrego') {
        selectedMainIds.add(ct.idTarea);
      } else if (ct.tipo == 'Avanzo') {
        selectedGestionIds.add(ct.idTarea);
      } else {
        selectedRapidaIds.add(ct.idTarea);
      }
    }

    // "Engañamos" a la UI quitando temporalmente el checkin de la vista
    // para que muestre el PlanningView
    data = AgendaResponse(
      checkinHoy: null,
      tareasSugeridas: data!.tareasSugeridas,
      backlog: data!.backlog,
      bloqueosActivos: data!.bloqueosActivos,
      bloqueosMeCulpan: data!.bloqueosMeCulpan,
    );
    notifyListeners();
  }
}
