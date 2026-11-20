class InventoryPage {
  constructor(page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]');
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
  }

  addButton(slug) {
    return this.page.locator(`[data-test="add-to-cart-${slug}"]`);
  }

  removeButton(slug) {
    return this.page.locator(`[data-test="remove-${slug}"]`);
  }

  async addProduct(slug) {
    await this.addButton(slug).click();
  }

  async openCart() {
    await this.cartLink.click();
  }
}

module.exports = { InventoryPage };
