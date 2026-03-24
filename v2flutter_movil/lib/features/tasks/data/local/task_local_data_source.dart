import 'dart:convert';

import 'package:sqflite/sqflite.dart';
import '../../domain/task_item.dart';
import 'local_database.dart';

class TaskLocalDataSource {
  Future<List<TaskItem>> getAll() async {
    final db = await LocalDatabase.instance.database;
    final rows = await db.query('tasks', orderBy: 'fecha_creacion DESC');
    return rows.map(TaskItem.fromMap).toList();
  }

  Future<int> insert(TaskItem task,
      {Map<String, dynamic>? additionalPayload}) async {
    final db = await LocalDatabase.instance.database;
    final id = await db.insert('tasks', task.toMap());

    final fullPayload = {
      ...task.toMap(),
      'id': id,
      ...?additionalPayload,
    };

    await _enqueueSync(
      entidad: 'task',
      entidadId: id,
      operacion: 'create',
      payload: jsonEncode(fullPayload),
    );
    return id;
  }

  Future<int> insertSynced(TaskItem task) async {
    final db = await LocalDatabase.instance.database;
    final syncedTask = task.copyWith(synced: true);
    return await db.insert('tasks', syncedTask.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> bulkInsertSynced(List<TaskItem> tasks) async {
    final db = await LocalDatabase.instance.database;
    await db.transaction((txn) async {
      for (final task in tasks) {
        final syncedTask = task.copyWith(synced: true);
        await txn.insert('tasks', syncedTask.toMap(),
            conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  Future<void> update(TaskItem task) async {
    if (task.id == null) return;
    final db = await LocalDatabase.instance.database;
    await db.update(
      'tasks',
      task.copyWith(synced: false).toMap(),
      where: 'id = ?',
      whereArgs: [task.id],
    );
    if (task.id != null) {
      await _enqueueSync(
        entidad: 'task',
        entidadId: task.id!,
        operacion: 'update',
        payload: jsonEncode(task.copyWith(synced: false).toMap()),
      );
    }
  }

  Future<void> markAsSynced(int id) async {
    final db = await LocalDatabase.instance.database;
    await db.update(
      'tasks',
      {'synced': 1, 'fecha_actualizacion': DateTime.now().toIso8601String()},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<List<Map<String, Object?>>> getPendingSyncEvents() async {
    final db = await LocalDatabase.instance.database;
    final now = DateTime.now().toIso8601String();
    return db.query(
      'sync_queue',
      where: 'next_retry_at IS NULL OR next_retry_at <= ?',
      whereArgs: [now],
      orderBy: 'creado_en ASC',
      limit: 100,
    );
  }

  Future<void> removeSyncEvent(int queueId) async {
    final db = await LocalDatabase.instance.database;
    await db.delete('sync_queue', where: 'id = ?', whereArgs: [queueId]);
  }

  Future<void> markSyncEventFailed({
    required int queueId,
    required int attempts,
    required String error,
  }) async {
    final db = await LocalDatabase.instance.database;
    final seconds = _retryDelaySeconds(attempts);
    final retryAt =
        DateTime.now().add(Duration(seconds: seconds)).toIso8601String();

    await db.update(
      'sync_queue',
      {
        'sync_attempts': attempts,
        'last_error': error,
        'next_retry_at': retryAt,
      },
      where: 'id = ?',
      whereArgs: [queueId],
    );
  }

  Future<void> _enqueueSync({
    required String entidad,
    required int entidadId,
    required String operacion,
    required String payload,
  }) async {
    final db = await LocalDatabase.instance.database;
    await db.insert('sync_queue', {
      'entidad': entidad,
      'entidad_id': entidadId,
      'operacion': operacion,
      'payload': payload,
      'creado_en': DateTime.now().toIso8601String(),
      'sync_attempts': 0,
      'next_retry_at': null,
      'last_error': null,
    });
  }

  int _retryDelaySeconds(int attempts) {
    if (attempts <= 1) return 5;
    if (attempts == 2) return 15;
    if (attempts == 3) return 45;
    if (attempts == 4) return 120;
    return 300;
  }
}
