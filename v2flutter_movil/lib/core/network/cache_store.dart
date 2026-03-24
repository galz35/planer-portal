import 'dart:convert';

import 'package:sqflite/sqflite.dart';

import '../../features/tasks/data/local/local_database.dart';

class CacheStore {
  CacheStore._();

  static final CacheStore instance = CacheStore._();

  Future<void> save(String key, Object value) async {
    final db = await LocalDatabase.instance.database;
    final payload = jsonEncode(value);
    await db.insert(
      'kv_cache',
      {
        'cache_key': key,
        'payload': payload,
        'updated_at': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<Map<String, dynamic>?> getMap(String key) async {
    final db = await LocalDatabase.instance.database;
    final rows = await db.query('kv_cache', where: 'cache_key = ?', whereArgs: [key], limit: 1);
    if (rows.isEmpty) return null;
    final payload = (rows.first['payload'] ?? '{}').toString();
    final decoded = jsonDecode(payload);
    if (decoded is Map<String, dynamic>) return decoded;
    return null;
  }

  Future<List<dynamic>> getList(String key) async {
    final db = await LocalDatabase.instance.database;
    final rows = await db.query('kv_cache', where: 'cache_key = ?', whereArgs: [key], limit: 1);
    if (rows.isEmpty) return <dynamic>[];
    final payload = (rows.first['payload'] ?? '[]').toString();
    final decoded = jsonDecode(payload);
    if (decoded is List<dynamic>) return decoded;
    return <dynamic>[];
  }
}
