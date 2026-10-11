const test = require('node:test');
const assert = require('node:assert/strict');

const routers = [
  ['/users', require('../Routes/UserRoute')],
  ['/bookings', require('../Routes/BookingRoute')],
  ['/chats', require('../Routes/ChatRoute')],
  ['/payments', require('../Routes/PaymentRoute')],
  ['/notifications', require('../Routes/NotificationRoute')],
  ['/admin', require('../Routes/AdminRoute')],
  ['/reviews', require('../Routes/ReviewRoute')],
  ['/kyc', require('../Routes/KycRoute')],
  ['/settings', require('../Routes/SettingsRoute')],
];

test('Swagger documents every registered HTTP endpoint', () => {
  const swagger = require('../swagger');
  const documentedOperations = new Set();

  for (const [path, operations] of Object.entries(swagger.paths || {})) {
    for (const method of Object.keys(operations)) {
      documentedOperations.add(`${method.toUpperCase()} ${path}`);
    }
  }

  const registeredOperations = new Set([
    'POST /payments/webhook',
    'GET /swagger.json',
  ]);

  for (const [prefix, router] of routers) {
    for (const layer of router.stack) {
      if (!layer.route) continue;

      const routePath = `${prefix}${layer.route.path === '/' ? '' : layer.route.path}`
        .replace(/:([A-Za-z0-9_]+)/g, '{$1}');
      for (const method of Object.keys(layer.route.methods)) {
        registeredOperations.add(`${method.toUpperCase()} ${routePath}`);
      }
    }
  }

  const undocumentedOperations = [...registeredOperations]
    .filter((operation) => !documentedOperations.has(operation));

  assert.deepEqual(undocumentedOperations, []);
});

test('payout account Swagger documents its optional payload and onboarding response', () => {
  const operation = require('../swagger').paths['/payments/payout-account'].post;
  const requestBody = operation.requestBody;
  const schema = requestBody.content['application/json'].schema;
  const responseSchema = operation.responses['201'].content['application/json'].schema;

  assert.equal(requestBody.required, false);
  assert.deepEqual(Object.keys(schema.properties).sort(), ['country', 'refreshUrl', 'returnUrl']);
  assert.deepEqual(responseSchema.required, ['message', 'accountId', 'url']);
});
