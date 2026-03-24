import { renderHook } from '@testing-library/react';
import { useSecureHTML } from './useSecureHTML';
import { describe, it, expect } from 'vitest';

describe('useSecureHTML', () => {
    it('should sanitize dangerous scripts', () => {
        const { result } = renderHook(() => useSecureHTML());
        const dangerous = '<img src=x onerror=alert(1)>';
        const clean = result.current.sanitize(dangerous);

        expect(clean.__html).not.toContain('onerror');
        expect(clean.__html).toContain('<img src="x">');
    });

    it('should allow safe html', () => {
        const { result } = renderHook(() => useSecureHTML());
        const safe = '<b>Bold</b>';
        const clean = result.current.sanitize(safe);

        expect(clean.__html).toBe('<b>Bold</b>');
    });
});
