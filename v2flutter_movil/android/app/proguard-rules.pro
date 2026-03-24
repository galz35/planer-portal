# Flutter R8/ProGuard Configuration

# Mantener clases básicas de Flutter y plugins
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# Seguridad para Firebase
-keep class com.google.firebase.** { *; }

# Seguridad para SecureStorage
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Ignorar warnings inofensivos
-dontwarn io.flutter.**
-dontwarn android.support.**
-dontwarn androidx.**
