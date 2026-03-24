Map<String, dynamic> unwrapApiData(dynamic body) {
  if (body is Map<String, dynamic>) {
    final inner = body['data'];
    if (inner is Map<String, dynamic>) return inner;
    return body;
  }
  return <String, dynamic>{};
}

List<dynamic> unwrapApiList(dynamic body) {
  if (body is Map<String, dynamic>) {
    final inner = body['data'];
    if (inner is List) return inner;
    if (inner is Map<String, dynamic> && inner['items'] is List) {
      return inner['items'] as List<dynamic>;
    }
    if (body['items'] is List) return body['items'] as List<dynamic>;
  }
  if (body is List) return body;
  return <dynamic>[];
}
