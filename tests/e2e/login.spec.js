const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { InventoryPage } = require('../pages/InventoryPage');
const { users } = require('../data/saucedemo');

test.describe('Inicio de sesión', () => {
  test('acepta standard_user y abre el inventario', async ({ page }) => {
    const login = new LoginPage(page);
    const inventory = new InventoryPage(page);

    await login.goto();
    await login.signIn(users.valid.username, users.valid.password);

    await expect(page).toHaveURL(/\/inventory\.html$/);
    await expect(inventory.title).toHaveText('Products');
  });

  test('rechaza una contraseña incorrecta', async ({ page }) => {
    const login = new LoginPage(page);

    await login.goto();
    await login.signIn(users.invalid.username, users.invalid.password);

    await expect(page).not.toHaveURL(/inventory\.html/);
    await expect(login.error).toContainText(
      'Username and password do not match any user in this service',
    );
  });

  test('rechaza al usuario bloqueado', async ({ page }) => {
    const login = new LoginPage(page);

    await login.goto();
    await login.signIn(users.locked.username, users.locked.password);

    await expect(page).not.toHaveURL(/inventory\.html/);
    await expect(login.error).toContainText('Sorry, this user has been locked out');
  });
});
