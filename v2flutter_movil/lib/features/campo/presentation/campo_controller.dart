import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:uuid/uuid.dart';
import 'package:intl/intl.dart';

import '../data/campo_api.dart';
import '../data/campo_local_db.dart';
import '../data/campo_sync_service.dart';
import '../domain/cliente_model.dart';
import '../domain/parada_ruta_model.dart';
import '../domain/punto_gps_model.dart';
import '../domain/recorrido_state.dart';
import '../domain/visita_model.dart';
import '../services/gps_service.dart';
import '../services/gps_validator.dart';
import '../services/route_optimizer.dart';

/// Controller principal del módulo de Campo.
/// Gestiona: planificación de ruta, recorrido, visitas y GPS tracking.
class CampoController extends ChangeNotifier {
  // ── Estado ──
  RecorridoState _recorrido = RecorridoState.initial;
  List<ClienteModel> _clientes = [];
  List<ClienteModel> _resultadosBusqueda = [];
  List<ParadaRutaModel> _rutaDia = [];
  List<PuntoGpsModel> _puntosPolyline = [];
  VisitaModel? _visitaActiva;
  Position? _miPosicion;
  String? _error;
  bool _cargando = false;
  double _distanciaTotal = 0;
  Duration _tiempoEstimado = Duration.zero;

  // ── Getters ──
  RecorridoState get recorrido => _recorrido;
  List<ClienteModel> get clientes => _clientes;
  List<ClienteModel> get resultadosBusqueda => _resultadosBusqueda;
  List<ParadaRutaModel> get rutaDia => _rutaDia;
  List<PuntoGpsModel> get puntosPolyline => _puntosPolyline;
  VisitaModel? get visitaActiva => _visitaActiva;
  Position? get miPosicion => _miPosicion;
  String? get error => _error;
  bool get cargando => _cargando;
  double get distanciaTotal => _distanciaTotal;
  Duration get tiempoEstimado => _tiempoEstimado;
  String get hoyStr => DateFormat('yyyy-MM-dd').format(DateTime.now());
  bool get enRecorrido => _recorrido.activo;
  bool get enVisita => _visitaActiva != null && _visitaActiva!.enCurso;

  int get visitasCompletadas => _rutaDia.where((p) => p.visitado).length;
  int get totalParadas => _rutaDia.length;

  ParadaRutaModel? get siguienteParada {
    try {
      return _rutaDia.firstWhere((p) => p.pendiente);
    } catch (_) {
      return null;
    }
  }

  // ── Inicialización ──

  Future<void> init() async {
    _cargando = true;
    notifyListeners();

    try {
      // Cargar datos locales
      _recorrido = await CampoLocalDb.obtenerRecorrido();
      _clientes = await CampoLocalDb.obtenerClientes();
      _rutaDia = await CampoLocalDb.obtenerRutaDia(hoyStr);

      // Cargar puntos del día para polyline
      if (_recorrido.activo) {
        _puntosPolyline = await CampoLocalDb.obtenerPuntosHoy();
        // Reactivar GPS tracking si el recorrido estaba activo
        GpsService.onNuevoPunto = _onNuevoPunto;
        GpsService.onEstadoChanged = _onEstadoChanged;
        await GpsService.iniciarTracking();
      }

      // Obtener posición actual
      _miPosicion = await GpsService.obtenerPosicionActual();

      // Intentar sync de clientes si hay pocos
      if (_clientes.isEmpty) {
        await _syncClientes();
      }

      _recalcularEstimaciones();
    } catch (e) {
      _error = 'Error al inicializar: $e';
    } finally {
      _cargando = false;
      notifyListeners();
    }

    // Iniciar auto-sync
    CampoSyncService.iniciarAutoSync();
  }

  // ══════════════════════════════════════════════
  //  PLANIFICACIÓN DE RUTA
  // ══════════════════════════════════════════════

  /// Busca clientes por nombre.
  Future<void> buscarClientes(String query) async {
    if (query.isEmpty) {
      _resultadosBusqueda = [];
      notifyListeners();
      return;
    }
    _resultadosBusqueda = await CampoLocalDb.buscarClientes(query);
    notifyListeners();
  }

  /// Agrega un cliente a la ruta de hoy.
  Future<void> agregarParada(ClienteModel cliente) async {
    // Verificar si ya está en la ruta
    if (_rutaDia.any((p) => p.clienteId == cliente.id)) return;

    final parada = ParadaRutaModel(
      fecha: hoyStr,
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      clienteDireccion: cliente.direccion,
      clienteLat: cliente.lat,
      clienteLon: cliente.lon,
      clienteRadio: cliente.radioMetros,
      orden: _rutaDia.length,
    );

    await CampoLocalDb.agregarParada(parada);
    _rutaDia = await CampoLocalDb.obtenerRutaDia(hoyStr);
    _recalcularEstimaciones();
    notifyListeners();
  }

  /// Quita un cliente de la ruta de hoy.
  Future<void> quitarParada(int clienteId) async {
    await CampoLocalDb.quitarParada(hoyStr, clienteId);
    _rutaDia = await CampoLocalDb.obtenerRutaDia(hoyStr);
    _recalcularEstimaciones();
    notifyListeners();
  }

  /// Optimiza el orden de las paradas (nearest-neighbor).
  Future<void> optimizarRuta() async {
    if (_rutaDia.isEmpty || _miPosicion == null) return;

    final soloPendientes = _rutaDia.where((p) => p.pendiente).toList();
    final yaVisitadas = _rutaDia.where((p) => !p.pendiente).toList();

    if (soloPendientes.isEmpty) return;

    final optimizadas = RouteOptimizer.optimizar(
      soloPendientes,
      miLat: _miPosicion!.latitude,
      miLon: _miPosicion!.longitude,
    );

    // Re-numerar: visitadas primero, luego optimizadas
    final nuevaRuta = <ParadaRutaModel>[];
    for (int i = 0; i < yaVisitadas.length; i++) {
      nuevaRuta.add(yaVisitadas[i].copyWith(orden: i));
    }
    for (int i = 0; i < optimizadas.length; i++) {
      nuevaRuta.add(optimizadas[i].copyWith(orden: yaVisitadas.length + i));
    }

    final ids = nuevaRuta.map((p) => p.clienteId).toList();
    await CampoLocalDb.reordenarParadas(hoyStr, ids);
    _rutaDia = await CampoLocalDb.obtenerRutaDia(hoyStr);
    _recalcularEstimaciones();
    notifyListeners();
  }

  /// Reordena manualmente las paradas.
  Future<void> reordenarRuta(int oldIndex, int newIndex) async {
    if (newIndex > oldIndex) newIndex -= 1;
    final item = _rutaDia.removeAt(oldIndex);
    _rutaDia.insert(newIndex, item);

    final ids = _rutaDia.map((p) => p.clienteId).toList();
    await CampoLocalDb.reordenarParadas(hoyStr, ids);
    _rutaDia = await CampoLocalDb.obtenerRutaDia(hoyStr);
    _recalcularEstimaciones();
    notifyListeners();
  }

  // ══════════════════════════════════════════════
  //  RECORRIDO (GPS TRACKING)
  // ══════════════════════════════════════════════

  /// Inicia el recorrido.
  Future<bool> iniciarRecorrido() async {
    final permisos = await GpsService.solicitarPermisos();
    if (!permisos) {
      _error = 'Se necesitan permisos de ubicación';
      notifyListeners();
      return false;
    }

    final pos = await GpsService.obtenerPosicionActual();

    // 1. Notificar al backend
    try {
      await CampoApi.iniciarRecorrido(
        lat: pos?.latitude,
        lon: pos?.longitude,
      );
    } catch (_) {
      // Si falla por offline, se sincronizará luego o se ignora por ahora
    }

    // 2. Estado local
    await CampoLocalDb.iniciarRecorrido();
    _recorrido = await CampoLocalDb.obtenerRecorrido();

    // Configurar callbacks GPS
    GpsService.onNuevoPunto = _onNuevoPunto;
    GpsService.onEstadoChanged = _onEstadoChanged;

    await GpsService.iniciarTracking();
    notifyListeners();
    return true;
  }

  /// Detiene el recorrido (Finalizar el día).
  Future<void> detenerRecorrido() async {
    final pos = await GpsService.obtenerPosicionActual();

    // 1. Notificar al backend
    try {
      await CampoApi.finalizarRecorrido(
        lat: pos?.latitude,
        lon: pos?.longitude,
      );
    } catch (_) {
      // Offline fallback
    }

    // 2. Estado local
    GpsService.detenerTracking();
    await CampoLocalDb.detenerRecorrido();
    _recorrido = await CampoLocalDb.obtenerRecorrido();
    notifyListeners();

    // 3. Forzar Sync final
    await CampoSyncService.sincronizar();
  }

  void _onNuevoPunto(PuntoGpsModel punto) {
    _puntosPolyline.add(punto);
    _miPosicion = GpsService.lastPosition;
    notifyListeners();
  }

  void _onEstadoChanged(RecorridoState estado) {
    _recorrido = estado;
    notifyListeners();
  }

  // ══════════════════════════════════════════════
  //  VISITAS (CHECK-IN / CHECK-OUT)
  // ══════════════════════════════════════════════

  /// Registra check-in en un cliente.
  Future<bool> checkin(ClienteModel cliente) async {
    if (_miPosicion == null) {
      _miPosicion = await GpsService.obtenerPosicionActual();
      if (_miPosicion == null) {
        _error = 'No se pudo obtener la ubicación';
        notifyListeners();
        return false;
      }
    }

    final distancia = GpsValidator.distanciaACliente(
      _miPosicion!.latitude,
      _miPosicion!.longitude,
      cliente.lat,
      cliente.lon,
    );

    final dentro = GpsValidator.dentroGeocerca(
      _miPosicion!.latitude,
      _miPosicion!.longitude,
      cliente.lat,
      cliente.lon,
      radioMetros: cliente.radioMetros,
    );

    final now = DateTime.now().toIso8601String();
    final offlineId = const Uuid().v4();

    final visita = VisitaModel(
      offlineId: offlineId,
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      estado: 'EN_CURSO',
      checkinLat: _miPosicion!.latitude,
      checkinLon: _miPosicion!.longitude,
      checkinAccuracy: _miPosicion!.accuracy,
      distanciaCliente: distancia,
      dentroGeocerca: dentro,
      checkinTimestamp: now,
    );

    // Guardar en cola local
    final localId = await CampoLocalDb.insertarCheckin(visita.toCheckinDb());

    _visitaActiva = visita.copyWith(id: localId);

    // Marcar parada como visitada
    await CampoLocalDb.marcarParadaVisitada(hoyStr, cliente.id);
    _rutaDia = await CampoLocalDb.obtenerRutaDia(hoyStr);

    notifyListeners();
    return true;
  }

  /// Registra check-out (termina visita activa).
  Future<void> checkout({String? observacion, String? fotoPath}) async {
    if (_visitaActiva == null) return;

    _miPosicion = await GpsService.obtenerPosicionActual();
    final now = DateTime.now().toIso8601String();

    // Calcular duración
    int? duracion;
    if (_visitaActiva!.checkinTimestamp != null) {
      final inicio = DateTime.tryParse(_visitaActiva!.checkinTimestamp!);
      if (inicio != null) {
        duracion = DateTime.now().difference(inicio).inMinutes;
      }
    }

    final updated = _visitaActiva!.copyWith(
      estado: 'FINALIZADA',
      checkoutLat: _miPosicion?.latitude,
      checkoutLon: _miPosicion?.longitude,
      checkoutAccuracy: _miPosicion?.accuracy,
      checkoutTimestamp: now,
      observacion: observacion,
      fotoPath: fotoPath,
      duracionMin: duracion,
    );

    await CampoLocalDb.insertarCheckout(updated.toCheckoutDb());

    _visitaActiva = null;
    notifyListeners();
  }

  /// Cancela la visita activa sin registrar check-out.
  void cancelarVisita() {
    _visitaActiva = null;
    notifyListeners();
  }

  // ══════════════════════════════════════════════
  //  CLIENTES
  // ══════════════════════════════════════════════

  /// Obtiene un cliente por ID.
  ClienteModel? getCliente(int id) {
    try {
      return _clientes.firstWhere((c) => c.id == id);
    } catch (_) {
      return null;
    }
  }

  /// Calcula distancia a un cliente desde mi posición actual.
  double? distanciaACliente(ClienteModel cliente) {
    if (_miPosicion == null) return null;
    return GpsValidator.distanciaACliente(
      _miPosicion!.latitude,
      _miPosicion!.longitude,
      cliente.lat,
      cliente.lon,
    );
  }

  /// ¿Estoy dentro del geocerca de este cliente?
  bool? dentroGeocerca(ClienteModel cliente) {
    if (_miPosicion == null) return null;
    return GpsValidator.dentroGeocerca(
      _miPosicion!.latitude,
      _miPosicion!.longitude,
      cliente.lat,
      cliente.lon,
      radioMetros: cliente.radioMetros,
    );
  }

  // ══════════════════════════════════════════════
  //  SYNC
  // ══════════════════════════════════════════════

  /// Sincroniza all data con el servidor.
  Future<Map<String, int>> sincronizar() async {
    _cargando = true;
    notifyListeners();

    final resultado = await CampoSyncService.sincronizar();

    // Recargar clientes
    _clientes = await CampoLocalDb.obtenerClientes();

    _cargando = false;
    notifyListeners();
    return resultado;
  }

  /// Sync de clientes.
  Future<void> _syncClientes() async {
    try {
      final clientesJson = await CampoApi.obtenerClientes();
      final clientes = clientesJson
          .map((j) => ClienteModel.fromJson(j as Map<String, dynamic>))
          .toList();
      if (clientes.isNotEmpty) {
        await CampoLocalDb.reemplazarClientes(clientes);
        _clientes = clientes;
      }
    } catch (_) {
      // Sin conexión — usar cache
    }
  }

  // ══════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════

  void _recalcularEstimaciones() {
    if (_miPosicion == null || _rutaDia.isEmpty) {
      _distanciaTotal = 0;
      _tiempoEstimado = Duration.zero;
      return;
    }

    final pendientes = _rutaDia.where((p) => p.pendiente).toList();
    _distanciaTotal = RouteOptimizer.distanciaTotalKm(
      pendientes,
      miLat: _miPosicion!.latitude,
      miLon: _miPosicion!.longitude,
    );
    _tiempoEstimado = RouteOptimizer.tiempoEstimado(
      pendientes,
      miLat: _miPosicion!.latitude,
      miLon: _miPosicion!.longitude,
    );
  }

  /// Limpia el error actual.
  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    GpsService.detenerTracking();
    CampoSyncService.detenerAutoSync();
    super.dispose();
  }
}
