// Basic Flutter widget test for Momentus Mobile
//
// This test verifies the app can launch successfully.

import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_movil/app.dart';

void main() {
  testWidgets('App launches successfully', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const MomentusMobileApp());

    // Verify that the app starts (looking for any widget that appears)
    await tester.pump(const Duration(seconds: 1));
    expect(find.byType(MomentusMobileApp), findsOneWidget);
  });
}
