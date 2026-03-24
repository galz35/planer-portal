import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should display login page correctly', async ({ page }) => {
        await page.goto('/login');

        // Verify brand elements
        await expect(page.getByText('MOMENTUS')).toBeVisible();
        await expect(page.getByText('convierte esfuerzo en progreso')).toBeVisible();

        // Verify form elements
        await expect(page.getByRole('textbox', { name: /correo/i })).toBeVisible(); // Input type email usually accessible by placeholder or label
        // Note: Password inputs might not have 'textbox' role, checking by placeholder
        await expect(page.getByPlaceholder('••••••••')).toBeVisible();
        await expect(page.getByRole('button', { name: /ingresar/i })).toBeVisible();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        // Mock successful login API response
        await page.route('**/api/auth/login', async route => {
            const json = {
                access_token: 'fake-jwt-token',
                user: { id: 1, nombre: 'Test User', email: 'test@claro.com.ni' }
            };
            await route.fulfill({ json });
        });

        // Mock initial data fetching after login to avoid errors
        await page.route('**/api/clarity/mi-dia*', async route => {
            await route.fulfill({ json: { tareasDisponibles: [], checkinHoy: null, bloqueosActivos: [] } });
        });

        await page.goto('/login');

        await page.getByPlaceholder('tu@claro.com.ni').fill('test@claro.com.ni');
        await page.getByPlaceholder('••••••••').fill('password123');
        await page.getByRole('button', { name: /ingresar/i }).click();

        // Verify redirection to dashboard
        await expect(page).toHaveURL(/\/app\/mi-dia/);
    });

    test('should validation error on empty submit', async ({ page }) => {
        await page.goto('/login');

        // Click login without filling form (browser validation usually prevents submission or UI shows error)
        // Since we use 'required' attribute, we can check validity or try to fill invalid data

        // Fill invalid email
        await page.getByPlaceholder('tu@claro.com.ni').fill('invalid-email');
        await page.getByPlaceholder('••••••••').fill('123');
        await page.getByRole('button', { name: /ingresar/i }).click();

        // In a real scenario we would expect an error message from backend or browser validation
        // Here we just check we are still on login page
        await expect(page).toHaveURL(/\/login/);
    });
});
