import { describe, it, expect } from 'vitest';
import { validateForm } from './validation';

describe('validateForm', () => {
    it('should validate required fields', () => {
        const schema = {
            name: { required: true, message: 'Name is required' }
        };
        const errors = validateForm({ name: '' }, schema);
        expect(errors).toEqual({ name: 'Name is required' });
    });

    it('should validate minLength', () => {
        const schema = {
            password: { minLength: 6 }
        };
        const errors = validateForm({ password: '123' }, schema);
        expect(errors['password']).toContain('Mínimo 6');
    });

    it('should validate custom rules', () => {
        const schema = {
            age: { custom: (v: unknown) => typeof v === 'number' && v >= 18, message: 'Must be 18+' }
        };
        const errors = validateForm({ age: 10 }, schema);
        expect(errors.age).toBe('Must be 18+');
    });

    it('should pass if valid', () => {
        const schema = {
            email: { required: true, pattern: /@/ }
        };
        const errors = validateForm({ email: 'test@test.com' }, schema);
        expect(Object.keys(errors)).toHaveLength(0);
    });
});
