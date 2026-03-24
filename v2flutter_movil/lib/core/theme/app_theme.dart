import 'package:flutter/material.dart';

/// ============================================
/// MOMENTUS THEME - Corporativo Premium
/// ============================================
/// Diseño premium corporativo con crimson cálido como acento
/// y paleta slate + indigo para variedad visual armoniosa.

class MomentusTheme {
  MomentusTheme._(); // No instanciable

  // =============================================
  // PALETA DE COLORES - CORPORATE RED
  // =============================================

  /// Crimson Corporativo - Planner EF
  static const Color primary =
      Color(0xFFBE2D2D); // Crimson cálido (no puro rojo)
  static const Color primaryLight = Color(0xFFE25555);
  static const Color primaryDark =
      Color(0xFF8B1A1A); // Crimson oscuro empresarial

  /// Escala de Rojos
  static const Color red50 = Color(0xFFFFEBEE);
  static const Color red100 = Color(0xFFFFCDD2);
  static const Color red200 = Color(0xFFEF9A9A);
  static const Color red300 = Color(0xFFE57373);
  static const Color red400 = Color(0xFFEF5350);
  static const Color red500 = Color(0xFFF44336);
  static const Color red600 = Color(0xFFE53935);
  static const Color red700 = Color(0xFFD32F2F);
  static const Color red800 = Color(0xFFC62828);
  static const Color red900 = Color(0xFFB71C1C);

  /// Superficie neutra (nombrado correcto, sin confusión con verde)
  static const Color surface50 = Color(0xFFF8FAFC); // Fondo claro
  static const Color surface100 = Color(0xFFF1F5F9); // Fondo secundario
  static const Color success =
      Color(0xFF0D9668); // Teal para éxito (no choca con crimson)

  // Aliases legacy para compatibilidad
  static const Color green50 = surface50;
  static const Color green100 = surface100;

  /// Acento Secundario (Indigo - para variedad visual sin clashing)
  static const Color accent = Color(0xFF6366F1); // Indigo 500
  static const Color accentLight = Color(0xFFE0E7FF); // Indigo 100
  static const Color accentDark = Color(0xFF4338CA); // Indigo 700

  /// Neutrales (Slate) - Base del diseño profesional
  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate300 = Color(0xFFCBD5E1);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color slate900 = Color(0xFF0F172A); // Casi negro

  /// Semánticos
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFB91C1C); // Rojo error más oscuro
  static const Color info =
      Color(0xFF64748B); // Gris azulado (evitar azul puro)

  // =============================================
  // GRADIENTES
  // =============================================

  /// Gradiente Corporativo (Slate elegante → Crimson profundo)
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1E293B), Color(0xFF4A1C1C)],
  );

  /// Gradiente Hero (para headers visuales)
  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0F172A), Color(0xFF1E293B), Color(0xFF2D3A4F)],
  );

  /// Fondo limpio
  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.white, slate50],
  );

  // =============================================
  // SOMBRAS
  // =============================================

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.05),
          blurRadius: 10,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get buttonShadow => [
        BoxShadow(
          color: primary.withValues(alpha: 0.3),
          blurRadius: 8,
          offset: const Offset(0, 4),
        ),
      ];

  // =============================================
  // BORDES REDONDEADOS (Mobile First)
  // =============================================

  static const double radiusXs = 8;
  static const double radiusSm = 12;
  static const double radiusMd = 16;
  static const double radiusLg = 24;
  static const double radiusXl = 32;
  static const double radiusFull = 100;

  // =============================================
  // ESPACIADOS
  // =============================================

  static const double spaceXxs = 4;
  static const double spaceXs = 8;
  static const double spaceSm = 12;
  static const double spaceMd = 16;
  static const double spaceLg = 24;
  static const double spaceXl = 32;
  static const double spaceXxl = 48;

  // =============================================
  // TEMA PRINCIPAL
  // =============================================

  static ThemeData get theme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      fontFamily: 'Inter',

      // Esquema de colores: Rojo & Negro
      colorScheme: const ColorScheme.light(
        primary: primary,
        onPrimary: Colors.white,
        primaryContainer: red100,
        onPrimaryContainer: red900,
        secondary: slate800, // Negro/Gris secundario
        onSecondary: Colors.white,
        surface: Colors.white,
        onSurface: slate900,
        surfaceContainerHighest: slate100,
        error: error,
        onError: Colors.white,
      ),

      scaffoldBackgroundColor: const Color(0xFFF8FAFC),

      // AppBar limpia
      appBarTheme: const AppBarTheme(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: slate900,
        centerTitle: false,
        iconTheme: IconThemeData(color: slate800),
        titleTextStyle: TextStyle(
          fontFamily: 'Inter',
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: slate900,
        ),
      ),

      // Cards
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          side: const BorderSide(color: slate200),
        ),
        color: Colors.white,
        margin: EdgeInsets.zero,
      ),

      // Botones Primarios (Negros o Rojos, usaremos Rojo para CTA principal)
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 2,
          shadowColor: primary.withValues(alpha: 0.4),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMd),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Botones Outlined
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: slate800, // Texto oscuro
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          side: const BorderSide(color: slate300),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMd),
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontFamily: 'Inter',
          ),
        ),
      ),

      // Inputs
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: slate200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: slate200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        labelStyle: const TextStyle(color: slate500),
        floatingLabelBehavior: FloatingLabelBehavior.auto,
      ),

      // Navigation Bar
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: red50, // Indicador rojo sutil coherente
        elevation: 3,
        shadowColor: slate900.withValues(alpha: 0.08),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: primary, size: 26);
          }
          return const IconThemeData(color: slate400, size: 24);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          return TextStyle(
            fontFamily: 'Inter',
            fontSize: 11,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w700
                : FontWeight.w500,
            color: states.contains(WidgetState.selected) ? primary : slate500,
          );
        }),
      ),

      // Bottom Nav (Legacy)
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: primary,
        unselectedItemColor: slate400,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),

      // FAB
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: slate900, // Negro para contraste máximo
        foregroundColor: Colors.white,
      ),

      // Chips
      chipTheme: ChipThemeData(
        backgroundColor: slate50,
        selectedColor: red100,
        labelStyle: const TextStyle(color: slate700),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
        side: BorderSide.none,
      ),

      // Checkbox & Switch
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith(
            (states) => states.contains(WidgetState.selected) ? primary : null),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) =>
            states.contains(WidgetState.selected) ? primary : slate400),
        trackColor: WidgetStateProperty.resolveWith((states) =>
            states.contains(WidgetState.selected) ? red100 : slate200),
      ),

      textTheme: _textTheme,
    );
  }

  // =============================================
  // TIPOGRAFÍA
  // =============================================

  static const TextTheme _textTheme = TextTheme(
    // Display
    displayLarge: TextStyle(
      fontFamily: 'Inter',
      fontSize: 32,
      fontWeight: FontWeight.w700,
      letterSpacing: -1,
      color: slate900,
      height: 1.2,
    ),
    displayMedium: TextStyle(
      fontFamily: 'Inter',
      fontSize: 28,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.5,
      color: slate900,
      height: 1.25,
    ),
    displaySmall: TextStyle(
      fontFamily: 'Inter',
      fontSize: 24,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.3,
      color: slate900,
      height: 1.3,
    ),

    // Headlines
    headlineLarge: TextStyle(
      fontFamily: 'Inter',
      fontSize: 24,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.3,
      color: slate900,
    ),
    headlineMedium: TextStyle(
      fontFamily: 'Inter',
      fontSize: 20,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.2,
      color: slate900,
    ),
    headlineSmall: TextStyle(
      fontFamily: 'Inter',
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: slate900,
    ),

    // Titles
    titleLarge: TextStyle(
      fontFamily: 'Inter',
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: slate900,
    ),
    titleMedium: TextStyle(
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: FontWeight.w500,
      letterSpacing: 0.1,
      color: slate900,
    ),
    titleSmall: TextStyle(
      fontFamily: 'Inter',
      fontSize: 14,
      fontWeight: FontWeight.w500,
      color: slate600,
    ),

    // Body
    bodyLarge: TextStyle(
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: FontWeight.w400,
      letterSpacing: 0.1,
      color: slate800,
      height: 1.5,
    ),
    bodyMedium: TextStyle(
      fontFamily: 'Inter',
      fontSize: 14,
      fontWeight: FontWeight.w400,
      letterSpacing: 0.15,
      color: slate600,
      height: 1.5,
    ),
    bodySmall: TextStyle(
      fontFamily: 'Inter',
      fontSize: 12,
      fontWeight: FontWeight.w400,
      letterSpacing: 0.2,
      color: slate500,
      height: 1.4,
    ),

    // Labels
    labelLarge: TextStyle(
      fontFamily: 'Inter',
      fontSize: 14,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.1,
      color: slate800,
    ),
    labelMedium: TextStyle(
      fontFamily: 'Inter',
      fontSize: 12,
      fontWeight: FontWeight.w500,
      letterSpacing: 0.3,
      color: slate600,
    ),
    labelSmall: TextStyle(
      fontFamily: 'Inter',
      fontSize: 11,
      fontWeight: FontWeight.w500,
      letterSpacing: 0.4,
      color: slate500,
    ),
  );
}

// =============================================
// EXTENSIONES ÚTILES
// =============================================

extension MomentusContext on BuildContext {
  ThemeData get theme => Theme.of(this);
  TextTheme get textTheme => Theme.of(this).textTheme;
  ColorScheme get colors => Theme.of(this).colorScheme;

  // Colores rápidos
  Color get primaryColor => MomentusTheme.primary;
  Color get accentColor => MomentusTheme.accent;
  Color get backgroundColor => MomentusTheme.green50;
  Color get surfaceColor => Colors.white;

  // Semánticos
  Color get successColor => MomentusTheme.success;
  Color get warningColor => MomentusTheme.warning;
  Color get errorColor => MomentusTheme.error;
  Color get infoColor => MomentusTheme.info;
}

// =============================================
// SHIMMER SKELETON (ligero, no usa paquetes)
// =============================================

class ShimmerBox extends StatefulWidget {
  final double width;
  final double height;
  final double radius;

  const ShimmerBox({
    super.key,
    required this.width,
    required this.height,
    this.radius = 8,
  });

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, __) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.radius),
            gradient: LinearGradient(
              colors: const [
                Color(0xFFEDF2F7),
                Color(0xFFF7FAFC),
                Color(0xFFEDF2F7),
              ],
              stops: [
                (_controller.value - 0.3).clamp(0.0, 1.0),
                _controller.value,
                (_controller.value + 0.3).clamp(0.0, 1.0),
              ],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
          ),
        );
      },
    );
  }
}
