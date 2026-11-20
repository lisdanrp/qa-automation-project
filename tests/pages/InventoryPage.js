class InventoryPage {
  constructor(page) {
    this.page = page;
    this.title = page.getByTestId('title');
    this.cartLink = page.getByTestId('shopping-cart-link');
    this.cartBadge = page.getByTestId('shopping-cart-badge');
  }

  addButton(slug) {
    return this.page.getByTestId(`add-to-cart-${slug}`);
  }

  removeButton(slug) {
    return this.page.getByTestId(`remove-${slug}`);
  }

  async addProduct(slug) {
    await this.addButton(slug).click();
  }

  async openCart() {
    await this.cartLink.click();
  }
}

module.exports = { InventoryPage };
