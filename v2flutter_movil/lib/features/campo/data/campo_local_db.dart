import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../domain/cliente_model.dart';
import '../domain/punto_gps_model.dart';
import '../domain/parada_ruta_model.dart';
import '../domain/recorrido_state.dart';

/// Base de datos local SQLite para el módulo de campo.
/// Almacena clientes, ruta planeada, tracking GPS, check-ins/outs y estado de recorrido.
class CampoLocalDb {
  CampoLocalDb._();
  static Database? _db;

  static Future<Database> get db async {
    if (_db != null) return _db!;
    final dbPath = await getDatabasesPath();
    _db = await openDatabase(
      join(dbPath, 'campo_v1.db'),
      version: 1,
      onCreate: _onCreate,
    );
    return _db!;
  }

  static Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE vc_clientes_cache (
        id INTEGER PRIMARY KEY,
        codigo TEXT,
        nombre TEXT NOT NULL,
        direccion TEXT,
        telefono TEXT,
        contacto TEXT,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        radio_metros INTEGER DEFAULT 100,
        zona TEXT,
        ultima_visita TEXT,
        sincronizado INTEGER DEFAULT 1
      )
    ''');

    await db.execute('''
      CREATE TABLE vc_ruta_dia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        cliente_id INTEGER NOT NULL,
        cliente_nombre TEXT,
        orden INTEGER NOT NULL,
        estado TEXT DEFAULT 'PENDIENTE',
        UNIQUE(fecha, cliente_id)
      )
    ''');

    await db.execute('''
      CREATE TABLE vc_tracking_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        accuracy REAL,
        velocidad REAL,
        timestamp TEXT NOT NULL,
        fuente TEXT DEFAULT 'GPS',
        bateria INTEGER,
        mock INTEGER DEFAULT 0,
        sincronizado INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE vc_checkin_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offline_id TEXT UNIQUE NOT NULL,
        cliente_id INTEGER,
        cliente_nombre TEXT,
        lat REAL,
        lon REAL,
        accuracy REAL,
        distancia_cliente REAL,
        dentro_geocerca INTEGER,
        timestamp TEXT NOT NULL,
        foto_path TEXT,
        sincronizado INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE vc_checkout_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visita_id INTEGER,
        offline_checkin_id TEXT,
        lat REAL,
        lon REAL,
        accuracy REAL,
        observacion TEXT,
        timestamp TEXT NOT NULL,
        foto_path TEXT,
        sincronizado INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE vc_recorrido_activo (
        id INTEGER PRIMARY KEY DEFAULT 1,
        inicio TEXT,
        km_acumulado REAL DEFAULT 0,
        ultimo_lat REAL,
        ultimo_lon REAL,
        ultimo_timestamp TEXT,
        activo INTEGER DEFAULT 0
      )
    ''');

    // Insertar fila inicial del recorrido
    await db.insert('vc_recorrido_activo', {'id': 1, 'activo': 0});
  }

  // ══════════════════════════════════════════════
  //  CLIENTES CACHE
  // ══════════════════════════════════════════════

  /// Reemplaza toda la cache de clientes con datos del servidor.
  static Future<void> reemplazarClientes(List<ClienteModel> clientes) async {
    final d = await db;
    await d.transaction((txn) async {
      await txn.delete('vc_clientes_cache');
      for (final c in clientes) {
        await txn.insert('vc_clientes_cache', c.toDbMap(),
            conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  /// Obtiene todos los clientes de la cache local.
  static Future<List<ClienteModel>> obtenerClientes() async {
    final d = await db;
    final rows = await d.query('vc_clientes_cache', orderBy: 'nombre ASC');
    return rows.map(ClienteModel.fromDb).toList();
  }

  /// Busca clientes por nombre.
  static Future<List<ClienteModel>> buscarClientes(String query) async {
    final d = await db;
    final rows = await d.query(
      'vc_clientes_cache',
      where: 'nombre LIKE ?',
      whereArgs: ['%$query%'],
      orderBy: 'nombre ASC',
      limit: 20,
    );
    return rows.map(ClienteModel.fromDb).toList();
  }

  /// Inserta un cliente nuevo (creado en campo).
  static Future<int> insertarCliente(ClienteModel cliente) async {
    final d = await db;
    return d.insert('vc_clientes_cache', cliente.toDbMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  // ══════════════════════════════════════════════
  //  RUTA DEL DÍA
  // ══════════════════════════════════════════════

  /// Obtiene las paradas planeadas para una fecha.
  static Future<List<ParadaRutaModel>> obtenerRutaDia(String fecha) async {
    final d = await db;
    final rows = await d.rawQuery('''
      SELECT r.*, c.direccion, c.lat, c.lon, c.radio_metros
      FROM vc_ruta_dia r
      LEFT JOIN vc_clientes_cache c ON c.id = r.cliente_id
      WHERE r.fecha = ?
      ORDER BY r.orden ASC
    ''', [fecha]);
    return rows.map(ParadaRutaModel.fromDb).toList();
  }

  /// Agrega una parada a la ruta del día.
  static Future<void> agregarParada(ParadaRutaModel parada) async {
    final d = await db;
    await d.insert('vc_ruta_dia', parada.toDbMap(),
        conflictAlgorithm: ConflictAlgorithm.ignore);
  }

  /// Quita una parada de la ruta.
  static Future<void> quitarParada(String fecha, int clienteId) async {
    final d = await db;
    await d.delete('vc_ruta_dia',
        where: 'fecha = ? AND cliente_id = ?', whereArgs: [fecha, clienteId]);
  }

  /// Actualiza orden de las paradas.
  static Future<void> reordenarParadas(
      String fecha, List<int> clienteIds) async {
    final d = await db;
    await d.transaction((txn) async {
      for (int i = 0; i < clienteIds.length; i++) {
        await txn.update(
          'vc_ruta_dia',
          {'orden': i},
          where: 'fecha = ? AND cliente_id = ?',
          whereArgs: [fecha, clienteIds[i]],
        );
      }
    });
  }

  /// Marca una parada como visitada.
  static Future<void> marcarParadaVisitada(String fecha, int clienteId) async {
    final d = await db;
    await d.update(
      'vc_ruta_dia',
      {'estado': 'VISITADO'},
      where: 'fecha = ? AND cliente_id = ?',
      whereArgs: [fecha, clienteId],
    );
  }

  /// Obtiene el siguiente cliente pendiente.
  static Future<ParadaRutaModel?> siguienteParada(String fecha) async {
    final d = await db;
    final rows = await d.rawQuery('''
      SELECT r.*, c.direccion, c.lat, c.lon, c.radio_metros
      FROM vc_ruta_dia r
      LEFT JOIN vc_clientes_cache c ON c.id = r.cliente_id
      WHERE r.fecha = ? AND r.estado = 'PENDIENTE'
      ORDER BY r.orden ASC
      LIMIT 1
    ''', [fecha]);
    if (rows.isEmpty) return null;
    return ParadaRutaModel.fromDb(rows.first);
  }

  // ══════════════════════════════════════════════
  //  TRACKING GPS
  // ══════════════════════════════════════════════

  /// Inserta un punto GPS en la cola local.
  static Future<void> insertarPuntoGps(PuntoGpsModel punto) async {
    final d = await db;
    await d.insert('vc_tracking_queue', punto.toDbMap());
  }

  /// Obtiene puntos no sincronizados (para enviar en batch).
  static Future<List<PuntoGpsModel>> obtenerPuntosPendientes(
      {int limite = 50}) async {
    final d = await db;
    final rows = await d.query(
      'vc_tracking_queue',
      where: 'sincronizado = 0',
      orderBy: 'timestamp ASC',
      limit: limite,
    );
    return rows.map(PuntoGpsModel.fromDb).toList();
  }

  /// Marca puntos como sincronizados.
  static Future<void> marcarPuntosSincronizados(List<int> ids) async {
    if (ids.isEmpty) return;
    final d = await db;
    final placeholders = ids.map((_) => '?').join(',');
    await d.rawUpdate(
      'UPDATE vc_tracking_queue SET sincronizado = 1 WHERE id IN ($placeholders)',
      ids,
    );
  }

  /// Obtiene todos los puntos del día (para polyline en mapa).
  static Future<List<PuntoGpsModel>> obtenerPuntosHoy() async {
    final d = await db;
    final hoy = DateTime.now().toIso8601String().substring(0, 10);
    final rows = await d.query(
      'vc_tracking_queue',
      where: "timestamp LIKE ?",
      whereArgs: ['$hoy%'],
      orderBy: 'timestamp ASC',
    );
    return rows.map(PuntoGpsModel.fromDb).toList();
  }

  // ══════════════════════════════════════════════
  //  CHECK-IN / CHECK-OUT QUEUES
  // ══════════════════════════════════════════════

  /// Inserta un check-in en la cola.
  static Future<int> insertarCheckin(Map<String, dynamic> data) async {
    final d = await db;
    return d.insert('vc_checkin_queue', data);
  }

  /// Inserta un check-out en la cola.
  static Future<int> insertarCheckout(Map<String, dynamic> data) async {
    final d = await db;
    return d.insert('vc_checkout_queue', data);
  }

  /// Check-ins no sincronizados.
  static Future<List<Map<String, dynamic>>> checkinsPendientes() async {
    final d = await db;
    return d.query('vc_checkin_queue',
        where: 'sincronizado = 0', orderBy: 'timestamp ASC');
  }

  /// Check-outs no sincronizados.
  static Future<List<Map<String, dynamic>>> checkoutsPendientes() async {
    final d = await db;
    return d.query('vc_checkout_queue',
        where: 'sincronizado = 0', orderBy: 'timestamp ASC');
  }

  /// Marca check-in como sincronizado.
  static Future<void> marcarCheckinSync(int id) async {
    final d = await db;
    await d.update('vc_checkin_queue', {'sincronizado': 1},
        where: 'id = ?', whereArgs: [id]);
  }

  /// Marca check-out como sincronizado.
  static Future<void> marcarCheckoutSync(int id) async {
    final d = await db;
    await d.update('vc_checkout_queue', {'sincronizado': 1},
        where: 'id = ?', whereArgs: [id]);
  }

  /// Visitas del día (check-ins con sus datos).
  static Future<List<Map<String, dynamic>>> visitasHoy() async {
    final d = await db;
    final hoy = DateTime.now().toIso8601String().substring(0, 10);
    return d.query('vc_checkin_queue',
        where: "timestamp LIKE ?",
        whereArgs: ['$hoy%'],
        orderBy: 'timestamp ASC');
  }

  /// Visitas históricas de un cliente (local db limit 5)
  static Future<List<Map<String, dynamic>>> obtenerVisitasCliente(
      int clienteId) async {
    final d = await db;
    final rows = await d.rawQuery('''
      SELECT ci.timestamp as checkin_time, co.timestamp as checkout_time, co.observacion
      FROM vc_checkin_queue ci
      LEFT JOIN vc_checkout_queue co ON co.offline_checkin_id = ci.offline_id
      WHERE ci.cliente_id = ?
      ORDER BY ci.timestamp DESC
      LIMIT 5
    ''', [clienteId]);
    return rows;
  }

  // ══════════════════════════════════════════════
  //  RECORRIDO ACTIVO
  // ══════════════════════════════════════════════

  /// Obtiene el estado del recorrido activo.
  static Future<RecorridoState> obtenerRecorrido() async {
    final d = await db;
    final rows = await d.query('vc_recorrido_activo', where: 'id = 1');
    if (rows.isEmpty) return RecorridoState.initial;
    return RecorridoState.fromDb(rows.first);
  }

  /// Actualiza el estado del recorrido.
  static Future<void> actualizarRecorrido(RecorridoState state) async {
    final d = await db;
    await d.update('vc_recorrido_activo', state.toDbMap(), where: 'id = 1');
  }

  /// Inicia un nuevo recorrido.
  static Future<void> iniciarRecorrido() async {
    await actualizarRecorrido(RecorridoState(
      activo: true,
      inicio: DateTime.now().toIso8601String(),
      kmAcumulado: 0,
    ));
  }

  /// Detiene el recorrido activo.
  static Future<void> detenerRecorrido() async {
    final current = await obtenerRecorrido();
    await actualizarRecorrido(current.copyWith(activo: false));
  }

  // ══════════════════════════════════════════════
  //  UTILIDADES
  // ══════════════════════════════════════════════

  /// Limpia datos antiguos (>7 días) de tracking sincronizado.
  static Future<void> limpiarDatosAntiguos() async {
    final d = await db;
    final limite =
        DateTime.now().subtract(const Duration(days: 7)).toIso8601String();
    await d.delete('vc_tracking_queue',
        where: 'sincronizado = 1 AND timestamp < ?', whereArgs: [limite]);
  }

  /// Cuenta registros pendientes de sync.
  static Future<Map<String, int>> contarPendientes() async {
    final d = await db;
    final tracking = Sqflite.firstIntValue(await d.rawQuery(
            'SELECT COUNT(*) FROM vc_tracking_queue WHERE sincronizado = 0')) ??
        0;
    final checkins = Sqflite.firstIntValue(await d.rawQuery(
            'SELECT COUNT(*) FROM vc_checkin_queue WHERE sincronizado = 0')) ??
        0;
    final checkouts = Sqflite.firstIntValue(await d.rawQuery(
            'SELECT COUNT(*) FROM vc_checkout_queue WHERE sincronizado = 0')) ??
        0;
    return {
      'tracking': tracking,
      'checkins': checkins,
      'checkouts': checkouts,
      'total': tracking + checkins + checkouts,
    };
  }
}
