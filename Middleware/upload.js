const multer = require('multer');
const cloudinary = require('../Config/clodinary');

const uploadToCloudinary = (file) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    {
      folder: 'quickwatch',
      resource_type: 'auto',
      transformation: [{ width: 500, height: 500, crop: 'limit' }],
    },
    (error, result) => {
      if (error) return reject(error);
      if (!result?.secure_url && !result?.url) {
        return reject(new Error('Cloudinary upload returned no file URL.'));
      }

      resolve({
        ...result,
        path: result.secure_url || result.url,
        url: result.secure_url || result.url,
      });
    }
  );

  stream.end(file.buffer);
});

const withCloudinaryUpload = (handler) => (req, res, next) => {
  handler(req, res, async (error) => {
    if (error) return next(error);

    try {
      if (req.file) {
        const uploaded = await uploadToCloudinary(req.file);
        req.file.path = uploaded.path;
        req.file.url = uploaded.url;
      }

      if (req.files) {
        const files = Array.isArray(req.files)
          ? req.files
          : Object.values(req.files).flat();

        await Promise.all(files.map(async (file) => {
          const uploaded = await uploadToCloudinary(file);
          file.path = uploaded.path;
          file.url = uploaded.url;
        }));
      }

      return next();
    } catch (uploadError) {
      return next(uploadError);
    }
  });
};

const memoryUpload = multer({ storage: multer.memoryStorage() });

const upload = {
  single: (fieldName) => withCloudinaryUpload(memoryUpload.single(fieldName)),
  array: (fieldName, maxCount) => withCloudinaryUpload(memoryUpload.array(fieldName, maxCount)),
  fields: (fields) => withCloudinaryUpload(memoryUpload.fields(fields)),
};

module.exports = upload;