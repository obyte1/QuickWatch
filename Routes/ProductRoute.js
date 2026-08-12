const express = require('express');
//import authentication middleware
const { protect } = require('../Middleware/auth');

//import authorization middleware
const { authorize } = require('../Middleware/role');

const router = express.Router(); //

//import the product controller
const productController = require('../Controllers/ProductController');

//define the routes
router.post('/createproduct', protect, authorize('supperadmin'), productController.createProduct);

router.put('/updateproduct/:id', protect, authorize('storekeeper'), productController.updateProduct);
router.get('/getproductbyid/:id', protect, productController.getProductById);
router.get('/getallproducts', protect, productController.getAllProducts);

//export the router to be used in other files
module.exports = router;
