import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// ============================================
/// MOMENTUS WIDGETS - Kit de UI Reutilizable
/// ============================================
/// Componentes estilizados con verde suave premium.

// =============================================
// BOTÓN PRIMARIO CON GRADIENTE
// =============================================
class MomentusButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isOutlined;
  final IconData? icon;
  final double? width;
  final bool useGradient;

  const MomentusButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.isOutlined = false,
    this.icon,
    this.width,
    this.useGradient = true,
  });

  @override
  Widget build(BuildContext context) {
    if (isOutlined) {
      return SizedBox(
        width: width,
        height: 52,
        child: OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          child: _buildContent(context, false),
        ),
      );
    }

    // Botón con gradiente
    return Container(
      width: width,
      height: 52,
      decoration: BoxDecoration(
        gradient:
            useGradient && !isLoading ? MomentusTheme.primaryGradient : null,
        color: isLoading ? MomentusTheme.slate200 : null,
        borderRadius: BorderRadius.circular(MomentusTheme.radiusMd),
        boxShadow: isLoading ? null : MomentusTheme.buttonShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isLoading ? null : onPressed,
          borderRadius: BorderRadius.circular(MomentusTheme.radiusMd),
          child: Center(child: _buildContent(context, true)),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, bool isOnGradient) {
    final color = isOnGradient ? Colors.white : MomentusTheme.primary;

    if (isLoading) {
      return SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          valueColor: AlwaysStoppedAnimation(
              isOutlined ? MomentusTheme.primary : MomentusTheme.slate500),
        ),
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 8),
        ],
        Text(
          text,
          style: TextStyle(
            color: color,
            fontSize: 16,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.2,
          ),
        ),
      ],
    );
  }
}

// =============================================
// INPUT FIELD ELEGANTE
// =============================================
class MomentusTextField extends StatefulWidget {
  final String label;
  final String? hint;
  final TextEditingController? controller;
  final bool obscureText;
  final TextInputType keyboardType;
  final IconData? prefixIcon;
  final String? errorText;
  final ValueChanged<String>? onChanged;
  final bool autofocus;
  final int maxLines;
  final TextInputAction? textInputAction;

  const MomentusTextField({
    super.key,
    required this.label,
    this.hint,
    this.controller,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
    this.prefixIcon,
    this.errorText,
    this.onChanged,
    this.autofocus = false,
    this.maxLines = 1,
    this.textInputAction,
  });

  @override
  State<MomentusTextField> createState() => _MomentusTextFieldState();
}

class _MomentusTextFieldState extends State<MomentusTextField> {
  late bool _obscure;

  @override
  void initState() {
    super.initState();
    _obscure = widget.obscureText;
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      obscureText: _obscure,
      keyboardType: widget.keyboardType,
      onChanged: widget.onChanged,
      autofocus: widget.autofocus,
      maxLines: widget.maxLines,
      textInputAction: widget.textInputAction,
      decoration: InputDecoration(
        labelText: widget.label,
        hintText: widget.hint,
        errorText: widget.errorText,
        prefixIcon: widget.prefixIcon != null
            ? Icon(widget.prefixIcon, color: MomentusTheme.slate400)
            : null,
        suffixIcon: widget.obscureText
            ? IconButton(
                icon: Icon(
                  _obscure
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: MomentusTheme.slate400,
                ),
                onPressed: () => setState(() => _obscure = !_obscure),
              )
            : null,
      ),
    );
  }
}

// =============================================
// CARD DE TAREA
// =============================================
class MomentusTaskCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? projectName;
  final String priority;
  final bool isCompleted;
  final VoidCallback? onTap;
  final VoidCallback? onComplete;

  const MomentusTaskCard({
    super.key,
    required this.title,
    this.subtitle,
    this.projectName,
    this.priority = 'media',
    this.isCompleted = false,
    this.onTap,
    this.onComplete,
  });

  Color get _priorityColor {
    switch (priority.toLowerCase()) {
      case 'alta':
        return MomentusTheme.error;
      case 'media':
        return MomentusTheme.warning;
      case 'baja':
        return MomentusTheme.success;
      default:
        return MomentusTheme.slate400;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(MomentusTheme.radiusLg),
        boxShadow: MomentusTheme.cardShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(MomentusTheme.radiusLg),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Checkbox circular
                GestureDetector(
                  onTap: onComplete,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 26,
                    height: 26,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isCompleted
                          ? MomentusTheme.primary
                          : Colors.transparent,
                      border: Border.all(
                        color: isCompleted
                            ? MomentusTheme.primary
                            : MomentusTheme.slate300,
                        width: 2,
                      ),
                    ),
                    child: isCompleted
                        ? const Icon(Icons.check, size: 16, color: Colors.white)
                        : null,
                  ),
                ),
                const SizedBox(width: 14),

                // Contenido
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(
                              decoration: isCompleted
                                  ? TextDecoration.lineThrough
                                  : null,
                              color:
                                  isCompleted ? MomentusTheme.slate400 : null,
                            ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          subtitle!,
                          style: Theme.of(context).textTheme.bodySmall,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          // Badge de prioridad
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: _priorityColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(
                                  MomentusTheme.radiusFull),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: _priorityColor,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  priority[0].toUpperCase() +
                                      priority.substring(1),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: _priorityColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (projectName != null) ...[
                            const SizedBox(width: 10),
                            const Icon(
                              Icons.folder_outlined,
                              size: 14,
                              color: MomentusTheme.slate400,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                projectName!,
                                style: Theme.of(context).textTheme.labelSmall,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),

                // Flecha
                const Icon(
                  Icons.chevron_right_rounded,
                  color: MomentusTheme.slate300,
                  size: 22,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// =============================================
// CARD DE ESTADÍSTICA
// =============================================
class MomentusStatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color? color;
  final String? subtitle;
  final VoidCallback? onTap;

  const MomentusStatCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    this.color,
    this.subtitle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cardColor = color ?? MomentusTheme.primary;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(MomentusTheme.radiusLg),
        boxShadow: MomentusTheme.cardShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(MomentusTheme.radiusLg),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: cardColor.withValues(alpha: 0.1),
                        borderRadius:
                            BorderRadius.circular(MomentusTheme.radiusMd),
                      ),
                      child: Icon(icon, color: cardColor, size: 22),
                    ),
                    const Spacer(),
                    Text(
                      value,
                      style:
                          Theme.of(context).textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: cardColor,
                              ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// =============================================
// ESTADO VACÍO
// =============================================
class MomentusEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? description;
  final String? actionText;
  final VoidCallback? onAction;

  const MomentusEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.description,
    this.actionText,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(28),
              decoration: const BoxDecoration(
                color: MomentusTheme.slate50,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 48,
                color: MomentusTheme.slate300,
              ),
            ),
            const SizedBox(height: 28),
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            if (description != null) ...[
              const SizedBox(height: 10),
              Text(
                description!,
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
            ],
            if (actionText != null && onAction != null) ...[
              const SizedBox(height: 28),
              MomentusButton(
                text: actionText!,
                onPressed: onAction,
                icon: Icons.add_rounded,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// =============================================
// LOADING INDICATOR
// =============================================
class MomentusLoading extends StatelessWidget {
  final String? message;

  const MomentusLoading({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 44,
            height: 44,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation(MomentusTheme.primary),
            ),
          ),
          if (message != null) ...[
            const SizedBox(height: 20),
            Text(
              message!,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ],
      ),
    );
  }
}

// =============================================
// SECTION HEADER
// =============================================
class MomentusSectionHeader extends StatelessWidget {
  final String title;
  final String? actionText;
  final VoidCallback? onAction;

  const MomentusSectionHeader({
    super.key,
    required this.title,
    this.actionText,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          if (actionText != null)
            TextButton(
              onPressed: onAction,
              child: Text(actionText!),
            ),
        ],
      ),
    );
  }
}

// =============================================
// AVATAR
// =============================================
class MomentusAvatar extends StatelessWidget {
  final String? imageUrl;
  final String? initials;
  final double size;
  final Color? backgroundColor;

  const MomentusAvatar({
    super.key,
    this.imageUrl,
    this.initials,
    this.size = 44,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = backgroundColor ?? MomentusTheme.red100;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: bgColor,
        image: imageUrl != null
            ? DecorationImage(
                image: NetworkImage(imageUrl!),
                fit: BoxFit.cover,
              )
            : null,
      ),
      child: imageUrl == null && initials != null
          ? Center(
              child: Text(
                initials!.toUpperCase(),
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w600,
                  fontSize: size * 0.38,
                  color: MomentusTheme.red900,
                ),
              ),
            )
          : null,
    );
  }
}
