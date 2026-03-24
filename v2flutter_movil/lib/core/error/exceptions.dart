class OfflineException implements Exception {
  final String message;
  const OfflineException([this.message = 'No internet connection']);

  @override
  String toString() => message;
}

class ServerException implements Exception {
  final String message;
  const ServerException([this.message = 'Server Error']);

  @override
  String toString() => message;
}
