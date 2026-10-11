const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../Models/Users');
const { updateProfile } = require('../Controllers/ProfileController');

test('users and admins can update their own profile picture without changing email', async () => {
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;

  try {
    for (const role of ['Mother', 'Admin']) {
      let updateQuery;
      let updateFields;
      User.findByIdAndUpdate = async (id, updates, options) => {
        updateQuery = { id, options };
        updateFields = updates;
        return {
          _id: id,
          FirstName: 'Taylor',
          LastName: 'Example',
          Email: 'original@example.com',
          picture: updates.picture,
          role,
          status: 'Active',
        };
      };

      let statusCode;
      let responseBody;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          responseBody = body;
          return this;
        },
      };

      await updateProfile({
        user: { id: `user-${role}`, role },
        body: {
          FirstName: 'Taylor',
          Email: 'changed@example.com',
        },
        file: { path: 'https://example.com/profile-picture.jpg' },
      }, res);

      assert.equal(statusCode, 200);
      assert.equal(updateQuery.id, `user-${role}`);
      assert.equal(updateQuery.options.new, true);
      assert.equal(updateFields.FirstName, 'Taylor');
      assert.equal(updateFields.picture, 'https://example.com/profile-picture.jpg');
      assert.equal(Object.hasOwn(updateFields, 'Email'), false);
      assert.equal(responseBody.user.Email, 'original@example.com');
      assert.equal(responseBody.user.picture, 'https://example.com/profile-picture.jpg');
    }
  } finally {
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});
