import { expect, test } from '@playwright/test';

test.describe('End-to-End Authentication User Journey', () => {
  test('registers a new user, reaches /app, survives refresh, logs out, and denies protected access after logout', async ({
    page,
  }) => {
    const uniqueEmail = `e2e.user.${Date.now()}@example.com`;
    const userName = 'E2E Test Engineer';
    const userPassword = 'SecurePassword1!';

    // 1. Open signup
    await page.goto('/signup');
    await expect(
      page.getByRole('heading', { name: 'Create your account' }),
    ).toBeVisible();

    // 2. Register a new user
    await page.getByLabel('Full Name').fill(userName);
    await page.getByLabel('Email Address').fill(uniqueEmail);
    await page.getByLabel('Password', { exact: true }).fill(userPassword);
    await page.getByRole('button', { name: 'Create Account' }).click();

    // 3. Reach the application page (/app)
    await expect(page).toHaveURL(/\/app$/);

    // 4. Verify the exact welcome message
    const welcomeHeading = page.getByTestId('welcome-message');
    await expect(welcomeHeading).toBeVisible();
    await expect(welcomeHeading).toHaveText('Welcome to the application.');
    await expect(page.getByTestId('user-name')).toHaveText(userName);
    await expect(page.getByTestId('user-email')).toHaveText(uniqueEmail);

    // 5. Refresh the page
    await page.reload();

    // 6. Verify that the session is still recognized after refresh
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByTestId('welcome-message')).toHaveText(
      'Welcome to the application.',
    );
    await expect(page.getByTestId('user-email')).toHaveText(uniqueEmail);

    // 7. Logout
    await page.getByTestId('logout-button').click();

    // 8. Verify redirection to signin
    await expect(page).toHaveURL(/\/signin$/);
    await expect(
      page.getByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();

    // 9. Verify that protected access is denied after logout (both UI route & API endpoint)
    await page.goto('/app');
    await expect(page).toHaveURL(/\/signin$/);

    const apiResponseAfterLogout = await page.request.get(
      'http://localhost:4000/api/application',
    );
    expect(apiResponseAfterLogout.status()).toBe(401);
  });
});
