const users = {
  valid: { username: 'standard_user', password: 'secret_sauce' },
  invalid: { username: 'standard_user', password: 'wrong_password' },
  locked: { username: 'locked_out_user', password: 'secret_sauce' },
};

const customer = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  postalCode: '28001',
};

const products = {
  backpack: { slug: 'sauce-labs-backpack', name: 'Sauce Labs Backpack', price: 29.99 },
  bikeLight: { slug: 'sauce-labs-bike-light', name: 'Sauce Labs Bike Light', price: 9.99 },
};

module.exports = { users, customer, products };
