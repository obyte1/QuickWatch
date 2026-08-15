const Product = require('../Models/Products');
const upload = require('../Middleware/upload');
const sendEmail = require('../Middleware/emailsender');


//create a product
exports.createProduct = async (req, res) => {
    try {

        //check if all required fields are provided
        if (!req.body.name || !req.body.size || !req.body.description || !req.body.price || !req.body.quantity) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const { name, size, description, price, quantity, color } = req.body;  

        const product = new Product({name,size,description,price, quantity, color});    

        await product.save();

        //generate otp
        const otp = Math.floor(100000 + Math.random() * 900000); //generate a 6 digit otp

        //send email notification to the admin that a new product has been created
        const subject = 'New Product Created';
        
        const text = `A new product has been created: here is your otp: ${otp}\n\nName: ${name}\nSize: ${size}\nDescription: ${description}\nPrice: ${price}\nQuantity: ${quantity}\nColor: ${color}`;
        await sendEmail('kachi@tsacademyonline.com', subject, text);


        res.status(201).json({ message: 'Product created successfully', product });
    } catch (error) {
        res.status(500).json({ message: 'Error creating product', error: error.message });
    }       
};



exports.createProductWithImage = async (req, res) => {
    upload.single('image')(req, res, async (err) => {

        // Check upload error
        if (err) {
            return res.status(400).json({
                message: 'Error uploading image',
                error: err.message
            });
        }

        try {
            // Get product data from request body
            const {
                name,
                size,
                description,
                price,
                quantity,
                color
            } = req.body;

            // Check required fields
            if (!name || !size || !description || !price || !quantity) {
                return res.status(400).json({
                    message: 'Please provide all required fields'
                });
            }

            // Check if image was uploaded
            if (!req.file) {
                return res.status(400).json({
                    message: 'Please provide an image'
                });
            }
console.log(req.file.path);
console.log(req.body);
            // Create product
            const product = new Product({
                name,
                size,
                description,
                price,
                quantity,
                color,
                image: req.file.path
            });

            // Save product to database
            await product.save();

            return res.status(201).json({
                message: 'Product created successfully',
                product
            });

        } catch (error) {
            return res.status(500).json({
                message: 'Error creating product',
                error: error.message
            });
        }
    });
};




//update a product
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params; //where id is the product id to be updated
        const { name, size, description, price, quantity, color } = req.body;
        console.log(req.body);

        const product = await Product.findByIdAndUpdate(id, { name, size, description, price, quantity, color }, { new: true });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }   

        res.status(200).json({ message: 'Product updated successfully', product });
    }   
    catch (error) {
        res.status(500).json({ message: 'Error updating product', error: error.message });
    }

};

exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product retrieved successfully', product });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving product', error: error.message });
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json({ message: 'Products retrieved successfully', products });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving products', error: error.message });
    }
};
