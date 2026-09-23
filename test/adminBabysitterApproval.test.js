const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../Routes/AdminRoute');
const { resolveStatusUpdate } = require('../Controllers/AdminController');

function hasRoute(method, path) {
  return router.stack.some((layer) => {
    if (!layer.route) return false;
    return layer.route.methods[method] && layer.route.path === path;
  });
}

test('admin exposes a dedicated babysitter approval endpoint', () => {
  assert.equal(hasRoute('patch', '/babysitters/:id/approve'), true);
});

test('status update accepts action aliases when body is missing status', () => {
  assert.deepEqual(resolveStatusUpdate({ action: 'approve' }), { status: 'Active', reason: '' });
  assert.deepEqual(resolveStatusUpdate({ action: 'reject', reason: 'Bad profile' }), { status: 'Rejected', reason: 'Bad profile' });
  assert.deepEqual(resolveStatusUpdate({}), { status: null, reason: '' });
});
