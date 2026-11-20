# Pruebas de SauceDemo y Restful Booker

Playwright, en JavaScript, prueba la interfaz de [SauceDemo](https://www.saucedemo.com) y la API de [Restful Booker](https://restful-booker.herokuapp.com). JMeter mide la carga de lectura de esa API.

## Cómo ejecutarlo

Hace falta Node.js 22. La carga pide además Java 17. Si no existe `JMETER_HOME`, el script descarga JMeter 5.6.3 la primera vez.

```bash
npm ci
npx playwright install chromium firefox
npm test
```

`npm test` corre Chromium y Firefox, con login correcto, login fallido y compra, y el proyecto `api`, con token, alta, consulta, modificación y borrado.

La carga son 10 usuarios durante 60 segundos:

```bash
npm run test:load
```

El informe queda en `performance/results/html-report/index.html`. En esta máquina salieron 439 muestras y 0 fallos de aserción. Esa carpeta, `tools/` y `jmeter.log` quedan fuera de git.

`.github/workflows/playwright.yml` se dispara con cada push y cada pull request. Instala dependencias, ejecuta `npx playwright test` y guarda el informe HTML durante 14 días. Si `package-lock.json` no cambió, restaura Chromium y Firefox de la caché e instala solo las librerías del sistema. La primera vez los descarga. Sin caché, una descarga tardó 17 minutos y otra 26 segundos. Las pruebas duraron unos 9 segundos las dos veces. JMeter se lanza solo con `npm run test:load`. Esas instalaciones no tocan el PC.

## Decisiones

`@playwright/test` cubre la interfaz y la API. Los proyectos `chromium` y `firefox` leen `tests/e2e`. El proyecto `api` lee `tests/api`, así el CRUD no se repite en cada navegador.

Las páginas localizan y actúan. Las pruebas afirman. Usuarios, cliente y productos están en `tests/data/saucedemo.js`.

Los localizadores van en este orden: `getByRole`, `getByLabel`, `getByPlaceholder`, `getByTestId`, `getByText` y CSS. SauceDemo marca los controles con `data-test`, y `testIdAttribute` usa ese nombre. El aviso de login es `getByRole('alert')`: el `h3` tiene `role="alert"` y Playwright no lo trata como encabezado.

Cada prueba de pantalla abre su página y entra sola cuando el caso lo necesita. La sesión no se guarda entre pruebas. Cada prueba de API pide su token y crea su reserva.

Los códigos son los que devuelve el servicio. `PUT` sin cookie responde 403. `DELETE` responde 201. El `GET` siguiente responde 404. `GET /ping` responde 201 y el texto `Created`.

`send` repite la llamada cuando el estado es 500 o mayor, dos veces como máximo, y se detiene en cuanto llega otro código. El alta y el borrado van una sola vez, para no crear una reserva de más. Entre un intento y el siguiente no hay pausa.

La carga usa diez hilos durante un minuto, sobre `GET /ping` y `GET /booking`. Entre peticiones espera un segundo para no saturar la demo pública.

`checkout`, `setup-node` y `upload-artifact` están en v7, que declara Node 24. Las pruebas usan Node 22, igual que este equipo.

## Qué haría con más tiempo

Separaría la API y la interfaz en el workflow. Si Heroku falla, hoy falla también el job de SauceDemo.

En la compra volvería a mirar los nombres en el resumen y, al terminar, comprobaría que el carrito quedó vacío. El encabezado final ya se busca por el texto `Thank you for your order!`, así que la aserción repite el localizador.

## Cómo usé la IA

### Qué le pedí

Un plan por etapas antes de escribir código, para revisar las prácticas sobre la marcha. JavaScript. Los commits los hago yo. SauceDemo con Page Object Model en dos navegadores, el CRUD de reservas con token, JMeter con 10 usuarios durante un minuto e informe HTML, un workflow de Playwright y este README.

### Qué acepté

Las siete etapas. Playwright para la interfaz y para la API. Las aserciones en el test. La jerarquía de localizadores. Una reserva distinta en cada operación. La carga limitada a lecturas. Un solo job de Actions. El reintento de la API solo cuando el estado es 5xx.

### Qué corregí

Los localizadores pasaron de `data-test` directo a rol, placeholder o `getByTestId`, y el error de login quedó como alerta. Dejé fuera subir los tiempos de espera para tapar un fallo intermitente. El login sigue dentro de cada prueba. El carrito se comprueba dentro de la compra, y no hay un caso de carrito vacío porque SauceDemo igual llega a `Thank you for your order!`. Las actions v4 avisaban de Node 20 y pasaron a v7. La versión de las pruebas sigue en 22.
