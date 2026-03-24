import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class NotificationPreferences {
  const NotificationPreferences({
    required this.enabled,
    required this.assignmentAlerts,
    required this.pendingReminders,
  });

  final bool enabled;
  final bool assignmentAlerts;
  final bool pendingReminders;

  NotificationPreferences copyWith({
    bool? enabled,
    bool? assignmentAlerts,
    bool? pendingReminders,
  }) {
    return NotificationPreferences(
      enabled: enabled ?? this.enabled,
      assignmentAlerts: assignmentAlerts ?? this.assignmentAlerts,
      pendingReminders: pendingReminders ?? this.pendingReminders,
    );
  }
}

class NotificationPreferencesService {
  NotificationPreferencesService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _keyEnabled = 'notifications_enabled';
  static const _keyAssignments = 'notifications_assignments';
  static const _keyPendingReminders = 'notifications_pending_reminders';

  final FlutterSecureStorage _storage;

  Future<NotificationPreferences> load() async {
    final enabled = await _readBool(_keyEnabled, fallback: true);
    final assignmentAlerts = await _readBool(_keyAssignments, fallback: true);
    final pendingReminders = await _readBool(_keyPendingReminders, fallback: true);

    return NotificationPreferences(
      enabled: enabled,
      assignmentAlerts: assignmentAlerts,
      pendingReminders: pendingReminders,
    );
  }

  Future<void> save(NotificationPreferences preferences) async {
    await _storage.write(key: _keyEnabled, value: preferences.enabled.toString());
    await _storage.write(
      key: _keyAssignments,
      value: preferences.assignmentAlerts.toString(),
    );
    await _storage.write(
      key: _keyPendingReminders,
      value: preferences.pendingReminders.toString(),
    );
  }

  Future<bool> _readBool(String key, {required bool fallback}) async {
    final value = await _storage.read(key: key);
    if (value == null) {
      return fallback;
    }
    return value.toLowerCase() == 'true';
  }
}
