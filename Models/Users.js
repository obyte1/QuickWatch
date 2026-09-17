const mongose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongose.Schema({
    FirstName: {
        type: String,
        required: true
    },
    LastName: { 
        type: String,
        required: true
    },
    Email: {
        type: String,
        required: false,
        unique: true
    },
    Password: {
        type: String,
        required: true
    },
    Gender: {
        type: String,
        required: true
    },
    Phone: {
        type: String,
        required: true  
    },
    zipCode: {
        type: String,
        required: true
    },
    Address: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Babysitter', 'Mother', 'Admin'],
    },
},
{timestamps: true} 
);

//create model from schema
const User = mongose.model('User', userSchema);

module.exports = User; //export the model to be used in other files