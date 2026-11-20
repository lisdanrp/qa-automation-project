const { test, expect } = require('@playwright/test');

const credentials = { username: 'admin', password: 'password123' };

function newBooking() {
  return {
    firstname: `QA${Date.now()}${Math.floor(Math.random() * 1000)}`,
    lastname: 'Automation',
    totalprice: 150,
    depositpaid: true,
    bookingdates: { checkin: '2026-12-01', checkout: '2026-12-10' },
    additionalneeds: 'Breakfast',
  };
}

async function send(action) {
  let response = await action();
  for (let attempt = 0; attempt < 2 && response.status() >= 500; attempt += 1) {
    response = await action();
  }
  return response;
}

async function tokenOf(request) {
  const response = await send(() => request.post('/auth', { data: credentials }));
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.token).toEqual(expect.any(String));
  expect(body.token.length).toBeGreaterThan(0);
  return body.token;
}

async function createBooking(request) {
  const booking = newBooking();
  const response = await request.post('/booking', { data: booking });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.bookingid).toEqual(expect.any(Number));
  expect(body.booking).toMatchObject(booking);
  return { id: body.bookingid, booking };
}

function removeBooking(request, id, token) {
  return request.delete(`/booking/${id}`, {
    headers: { Cookie: `token=${token}` },
  });
}

test.describe('Reservas de Restful Booker', () => {
  test('obtiene un token de autenticación', async ({ request }) => {
    await tokenOf(request);
  });

  test('crea una reserva', async ({ request }) => {
    const token = await tokenOf(request);
    const { id } = await createBooking(request);
    await removeBooking(request, id, token);
  });

  test('consulta la reserva creada', async ({ request }) => {
    const token = await tokenOf(request);
    const { id, booking } = await createBooking(request);
    try {
      const response = await send(() => request.get(`/booking/${id}`));
      expect(response.status()).toBe(200);
      expect(await response.json()).toMatchObject(booking);
    } finally {
      await removeBooking(request, id, token);
    }
  });

  test('rechaza la modificación sin token', async ({ request }) => {
    const token = await tokenOf(request);
    const { id, booking } = await createBooking(request);
    try {
      const response = await send(() => request.put(`/booking/${id}`, {
        data: { ...booking, totalprice: 220 },
      }));
      expect(response.status()).toBe(403);
      expect(await response.text()).toContain('Forbidden');
    } finally {
      await removeBooking(request, id, token);
    }
  });

  test('modifica la reserva con el token', async ({ request }) => {
    const token = await tokenOf(request);
    const { id, booking } = await createBooking(request);
    const changes = { ...booking, totalprice: 220, additionalneeds: 'Late checkout' };
    try {
      const response = await send(() => request.put(`/booking/${id}`, {
        headers: { Cookie: `token=${token}` },
        data: changes,
      }));
      expect(response.status()).toBe(200);
      expect(await response.json()).toMatchObject(changes);

      const stored = await send(() => request.get(`/booking/${id}`));
      expect(stored.status()).toBe(200);
      expect(await stored.json()).toMatchObject(changes);
    } finally {
      await removeBooking(request, id, token);
    }
  });

  test('borra la reserva', async ({ request }) => {
    const token = await tokenOf(request);
    const { id } = await createBooking(request);
    const removed = await removeBooking(request, id, token);

    // Esta API responde 201 al borrar.
    expect(removed.status()).toBe(201);
    expect(await removed.text()).toContain('Created');

    const missing = await send(() => request.get(`/booking/${id}`));
    expect(missing.status()).toBe(404);
    expect(await missing.text()).toContain('Not Found');
  });
});
