const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { InventoryPage } = require('../pages/InventoryPage');
const { CartPage } = require('../pages/CartPage');
const { CheckoutPage } = require('../pages/CheckoutPage');
const { users, customer, products } = require('../data/saucedemo');

test.describe('Compra', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(users.valid.username, users.valid.password);
    await expect(page).toHaveURL(/\/inventory\.html$/);
  });

  test('añade dos productos y completa el pedido', async ({ page }) => {
    const inventory = new InventoryPage(page);
    const cart = new CartPage(page);
    const checkout = new CheckoutPage(page);
    const selected = [products.backpack, products.bikeLight];
    const itemTotal = selected.reduce((sum, product) => sum + product.price, 0);

    for (const product of selected) {
      await inventory.addProduct(product.slug);
      await expect(inventory.removeButton(product.slug)).toBeVisible();
    }

    await expect(inventory.cartBadge).toHaveText(String(selected.length));
    await inventory.openCart();

    await expect(page).toHaveURL(/\/cart\.html$/);
    await expect(cart.title).toHaveText('Your Cart');
    await expect(cart.itemNames).toHaveText(selected.map((product) => product.name));

    await cart.checkout();
    await expect(page).toHaveURL(/\/checkout-step-one\.html$/);
    await checkout.fillInformation(customer);

    await expect(page).toHaveURL(/\/checkout-step-two\.html$/);
    await expect(checkout.itemTotal).toHaveText(`Item total: $${itemTotal.toFixed(2)}`);
    await checkout.finish();

    await expect(page).toHaveURL(/\/checkout-complete\.html$/);
    await expect(checkout.completeHeader).toHaveText('Thank you for your order!');
  });

  test('no cierra el pedido si el carrito está vacío', async ({ page }) => {
    test.fail(true, 'SauceDemo deja Checkout habilitado con el carrito vacío');

    const inventory = new InventoryPage(page);
    const cart = new CartPage(page);

    await inventory.openCart();
    await expect(page).toHaveURL(/\/cart\.html$/);
    await expect(cart.title).toHaveText('Your Cart');
    await expect(cart.itemNames).toHaveCount(0);
    await expect(cart.checkoutButton).toBeDisabled();
  });
});
