const mongose = require('mongoose');

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('<username>') || process.env.MONGO_URI.includes('<password>') || process.env.MONGO_URI.includes('<dbname>')) {
            console.warn('MongoDB URI is not configured. Please update MONGO_URI in your .env file. The app will continue without the database connection.');
            return false;
        }

        const conn = await mongose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        console.warn('The app is still running, but database-dependent features will not work until MongoDB is configured correctly.');
        return false;
    }
};

module.exports = connectDB;