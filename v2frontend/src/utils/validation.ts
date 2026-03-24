export interface ValidationRule {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => boolean;
    message?: string;
}

export type ValidationSchema = Record<string, ValidationRule>;

export const validateForm = (data: Record<string, unknown>, schema: ValidationSchema): Record<string, string> => {
    const errors: Record<string, string> = {};

    for (const field in schema) {
        const value = data[field];
        const rules = schema[field];

        if (rules.required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
            errors[field] = rules.message || 'Este campo es requerido';
            continue;
        }

        if (value) {
            if (rules.minLength && String(value).length < rules.minLength) {
                errors[field] = rules.message || `Mínimo ${rules.minLength} caracteres`;
            }
            if (rules.maxLength && String(value).length > rules.maxLength) {
                errors[field] = rules.message || `Máximo ${rules.maxLength} caracteres`;
            }
            if (rules.pattern && !rules.pattern.test(String(value))) {
                errors[field] = rules.message || 'Formato inválido';
            }
            if (rules.custom && !rules.custom(value)) {
                errors[field] = rules.message || 'Valor inválido';
            }
        }
    }

    return errors;
};
