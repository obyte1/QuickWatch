const multer = require('multer');
const {CloudinaryStorage} = require('multer-storage-cloudinary');
const cloudinary = require('../Config/clodinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "bokusuppermarket",
        allowedFormats: ['jpg', 'jpeg', 'png'],
        transformation: [{ width: 500, height: 500, crop: "limit" }]
    }
});