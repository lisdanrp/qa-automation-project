class CartPage {
  constructor(page) {
    this.page = page;
    this.title = page.getByTestId('title');
    this.itemNames = page.getByTestId('inventory-item-name');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' });
  }

  async checkout() {
    await this.checkoutButton.click();
  }
}

module.exports = { CartPage };
