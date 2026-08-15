const multer = require('multer');
const {CloudinaryStorage} = require('multer-storage-cloudinary');
const cloudinary = require('../Config/clodinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "bokusupermarket",
        allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ width: 500, height: 500, crop: "limit" }]
    }
});

const upload = multer({ storage: storage });

module.exports = upload;    

// const uploadToCloudinary = (buffer) => {
//     return new Promise((resolve, reject) => {
//         const stream = cloudinary.uploader.upload_stream(
//             {
//                 folder: "inventory-products"
//             },
//             (error, result) => {
//                 if (error) {
//                     reject(error);
//                 } else {
//                     resolve(result);
//                 }
//             }
//         );

//         stream.end(buffer);
//     });
// };