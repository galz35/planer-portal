import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from './useErrorHandler';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock del ToastContext
const mockShowToast = vi.fn();
vi.mock('../context/ToastContext', () => ({
    useToast: () => ({
        showToast: mockShowToast
    })
}));

describe('useErrorHandler', () => {
    beforeEach(() => {
        mockShowToast.mockClear();
    });

    it('handleApiError shows error message from Error object', () => {
        const { result } = renderHook(() => useErrorHandler());
        const error = new Error('Test Error');

        act(() => {
            result.current.handleApiError(error);
        });

        expect(mockShowToast).toHaveBeenCalledWith('Test Error', 'error');
    });

    it('handleApiError handles axios style error response', () => {
        const { result } = renderHook(() => useErrorHandler());
        const error = {
            response: {
                data: {
                    message: 'Backend Error'
                }
            }
        };

        act(() => {
            result.current.handleApiError(error);
        });

        expect(mockShowToast).toHaveBeenCalledWith('Backend Error', 'error');
    });

    it('handleApiError uses fallback message when error is unknown', () => {
        const { result } = renderHook(() => useErrorHandler());

        act(() => {
            result.current.handleApiError('some string error');
        });

        expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Ha ocurrido un error'), 'error');
    });

    it('withErrorHandling catches error and returns null', async () => {
        const { result } = renderHook(() => useErrorHandler());
        const throwingFn = async () => { throw new Error('Async Fail'); };

        let output;
        await act(async () => {
            output = await result.current.withErrorHandling(throwingFn);
        });

        expect(output).toBeNull();
        expect(mockShowToast).toHaveBeenCalledWith('Async Fail', 'error');
    });
});
