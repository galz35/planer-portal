import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../../features/home/presentation/home_shell.dart';
import 'auth_controller.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscureText = true;

  @override
  Widget build(BuildContext context) {
    // ignore: unused_local_variable
    final authFuncs = context.read<AuthController>();
    final isLoading = context.select<AuthController, bool>((c) => c.loading);
    final errorMsg = context.select<AuthController, String?>((c) => c.error);

    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;

    // Tema actual (Rojo Corporativo)
    const primaryColor = MomentusTheme.primary;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Row(
        children: [
          // PANEL IZQUIERDO (Branding Desktop)
          if (isDesktop)
            Expanded(
              flex: 5,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: MomentusTheme.heroGradient,
                ),
                child: Stack(
                  children: [
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Logo
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.05),
                              shape: BoxShape.circle,
                            ),
                            child: Image.asset(
                              'assets/images/logo.png',
                              height: 80,
                              errorBuilder: (_, __, ___) => const Icon(
                                  Icons.business,
                                  size: 64,
                                  color: Colors.white),
                            ),
                          ),
                          const SizedBox(height: 32),
                          const Text(
                            'PLANNER-EF',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 48,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                              letterSpacing: -1.5,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Eficiencia y Legado',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 20,
                              color: Colors.white.withValues(alpha: 0.7),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // PANEL DERECHO (Formulario)
          Expanded(
            flex: 5,
            child: Center(
              child: SafeArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Header Mobile
                        if (!isDesktop) ...[
                          Center(
                            child: Image.asset(
                              'assets/images/logo.png',
                              height: 64,
                              errorBuilder: (_, __, ___) => const Icon(
                                  Icons.business,
                                  size: 64,
                                  color: primaryColor),
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Center(
                            child: Text(
                              'PLANNER-EF',
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 32,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                                letterSpacing: -1,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Center(
                            child: Text(
                              'Accede a tu espacio de trabajo',
                              style: TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 16,
                              ),
                            ),
                          ),
                          const SizedBox(height: 40),
                        ] else ...[
                          const Text(
                            'Bienvenido de nuevo',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                              letterSpacing: -1,
                            ),
                          ),
                          const SizedBox(height: 48),
                        ],

                        // Form Card
                        Container(
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(24),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF0F172A)
                                    .withValues(alpha: 0.08),
                                blurRadius: 24,
                                offset: const Offset(0, 12),
                              ),
                            ],
                          ),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                // Accent Line Top (Rojo)
                                Center(
                                  child: Container(
                                    width: 40,
                                    height: 4,
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(
                                        colors: [
                                          primaryColor,
                                          MomentusTheme.primaryDark
                                        ],
                                      ),
                                      borderRadius: BorderRadius.circular(2),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 32),

                                // Email
                                TextFormField(
                                  controller: _emailCtrl,
                                  decoration: _inputDecoration(
                                      'Correo electrónico',
                                      Icons.email_outlined),
                                  keyboardType: TextInputType.emailAddress,
                                  validator: (v) => v == null || v.isEmpty
                                      ? 'Requerido'
                                      : null,
                                ),
                                const SizedBox(height: 20),

                                // Password
                                TextFormField(
                                  controller: _passCtrl,
                                  obscureText: _obscureText,
                                  decoration: _inputDecoration(
                                          'Contraseña', Icons.lock_outline)
                                      .copyWith(
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _obscureText
                                            ? Icons.visibility_outlined
                                            : Icons.visibility_off_outlined,
                                        color: const Color(0xFF94A3B8),
                                      ),
                                      onPressed: () => setState(
                                          () => _obscureText = !_obscureText),
                                    ),
                                  ),
                                  validator: (v) => v == null || v.isEmpty
                                      ? 'Requerido'
                                      : null,
                                  onFieldSubmitted: (_) => _submit(authFuncs),
                                ),

                                const SizedBox(height: 32),

                                if (errorMsg != null)
                                  Container(
                                    margin: const EdgeInsets.only(bottom: 24),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFEF2F2),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                          color: const Color(0xFFFECACA)),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.error_outline,
                                            color: Color(0xFFB91C1C), size: 20),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            errorMsg,
                                            style: const TextStyle(
                                                color: Color(0xFFB91C1C),
                                                fontSize: 13),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                // Button
                                SizedBox(
                                  height: 52,
                                  child: ElevatedButton(
                                    onPressed: isLoading
                                        ? null
                                        : () => _submit(authFuncs),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor:
                                          primaryColor, // Rojo Corporativo
                                      foregroundColor: Colors.white,
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                    child: isLoading
                                        ? const SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: Colors.white),
                                          )
                                        : const Text(
                                            'Iniciar Sesión',
                                            style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 16),
                                          ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(height: 32),
                        const Center(
                          child: Text(
                            '¿Olvidaste tu contraseña?',
                            style: TextStyle(
                              color: primaryColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Color(0xFF94A3B8)), // Slate 400
      prefixIcon: Icon(icon, color: const Color(0xFF94A3B8)),
      filled: true,
      fillColor: const Color(0xFFF8FAFC), // Slate 50
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)), // Slate 200
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: MomentusTheme.primary, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }

  void _submit(AuthController auth) async {
    if (!_formKey.currentState!.validate()) return;

    final success = await auth.login(
      _emailCtrl.text.trim(),
      _passCtrl.text.trim(),
    );

    if (success && mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HomeShell()),
      );
    }
  }
} // Fin class
