import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

class LocalDatabase {
  LocalDatabase._();

  static final LocalDatabase instance = LocalDatabase._();
  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;

    final docs = await getApplicationDocumentsDirectory();
    final dbPath = p.join(docs.path, 'momentus_mobile.db');
    _db = await openDatabase(
      dbPath,
      version: 5,
      onCreate: (db, version) async {
        await _createSchema(db);
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          await db.execute(
              'ALTER TABLE sync_queue ADD COLUMN sync_attempts INTEGER NOT NULL DEFAULT 0');
          await db
              .execute('ALTER TABLE sync_queue ADD COLUMN next_retry_at TEXT');
          await db.execute('ALTER TABLE sync_queue ADD COLUMN last_error TEXT');
          await db.execute(
              'CREATE INDEX IF NOT EXISTS idx_sync_queue_retry ON sync_queue(next_retry_at, creado_en)');
        }
        if (oldVersion < 3) {
          await db.execute('''
            CREATE TABLE IF NOT EXISTS notes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              titulo TEXT NOT NULL,
              contenido TEXT NOT NULL,
              fecha_actualizacion TEXT NOT NULL
            )
          ''');
        }
        if (oldVersion < 4) {
          await db.execute('''
            CREATE TABLE IF NOT EXISTS kv_cache (
              cache_key TEXT PRIMARY KEY,
              payload TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          ''');
        }
        if (oldVersion < 5) {
          // Migration for Task Metadata
          await db.execute(
              'ALTER TABLE tasks ADD COLUMN prioridad TEXT DEFAULT "Media"');
          await db.execute(
              'ALTER TABLE tasks ADD COLUMN tipo TEXT DEFAULT "Administrativa"');
          await db.execute('ALTER TABLE tasks ADD COLUMN fecha_objetivo TEXT');
          await db
              .execute('ALTER TABLE tasks ADD COLUMN responsable_id INTEGER');
          await db
              .execute('ALTER TABLE tasks ADD COLUMN responsable_nombre TEXT');
          await db.execute('ALTER TABLE tasks ADD COLUMN proyecto_nombre TEXT');
        }
      },
    );

    return _db!;
  }

  Future<void> _createSchema(Database db) async {
    await db.execute('''
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        estado TEXT NOT NULL,
        fecha_creacion TEXT NOT NULL,
        fecha_actualizacion TEXT,
        synced INTEGER NOT NULL DEFAULT 0,
        prioridad TEXT DEFAULT "Media",
        tipo TEXT DEFAULT "Administrativa",
        fecha_objetivo TEXT,
        responsable_id INTEGER,
        responsable_nombre TEXT,
        proyecto_nombre TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entidad TEXT NOT NULL,
        entidad_id INTEGER,
        operacion TEXT NOT NULL,
        payload TEXT NOT NULL,
        creado_en TEXT NOT NULL,
        sync_attempts INTEGER NOT NULL DEFAULT 0,
        next_retry_at TEXT,
        last_error TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        contenido TEXT NOT NULL,
        fecha_actualizacion TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE kv_cache (
        cache_key TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');

    await db.execute(
        'CREATE INDEX idx_tasks_estado_fecha ON tasks(estado, fecha_creacion DESC)');
    await db.execute('CREATE INDEX idx_tasks_synced ON tasks(synced)');
    await db.execute(
        'CREATE INDEX idx_sync_queue_retry ON sync_queue(next_retry_at, creado_en)');
  }
}
