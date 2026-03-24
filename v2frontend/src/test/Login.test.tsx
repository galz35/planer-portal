import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { LoginPage } from '../pages/LoginPage';

// Mock useNavigate
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn()
    };
});

// Mock auth context
vi.mock('../context/AuthContext', async () => {
    const actual = await vi.importActual('../context/AuthContext');
    return {
        ...actual,
        useAuth: () => ({
            login: vi.fn(),
            isAuthenticated: false,
            user: null
        })
    };
});

const renderLoginPage = () => {
    return render(
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <LoginPage />
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};

describe('Login Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render login form elements', () => {
        renderLoginPage();

        // Check for email and password inputs by placeholder
        expect(screen.getByPlaceholderText(/claro/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/••••/i)).toBeInTheDocument();
    });

    it('should render submit button', () => {
        renderLoginPage();

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('should allow typing in email field', () => {
        renderLoginPage();

        const emailInput = screen.getByPlaceholderText(/claro/i) as HTMLInputElement;
        fireEvent.change(emailInput, { target: { value: 'test@claro.com.ni' } });

        expect(emailInput.value).toBe('test@claro.com.ni');
    });

    it('should allow typing in password field', () => {
        renderLoginPage();

        const passwordInput = screen.getByPlaceholderText(/••••/i) as HTMLInputElement;
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(passwordInput.value).toBe('password123');
    });
});
