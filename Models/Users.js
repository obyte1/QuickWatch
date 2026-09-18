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
    emailVerified: {
        type: Boolean,
        default: true
    },
    emailVerificationToken: {
        type: String,
        default: null,
        select: false
    },
    emailVerificationExpires: {
        type: Date,
        default: null,
        select: false
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
    hourlyRate: {
        type: Number,
        min: 0,
        default: null
    },
    about: {
        type: String,
        default: ''
    },
    state: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        default: ''
    },
    picture: {
        type: String,
        default: ''
    },
    sendEmail: {
        type: Boolean,
        default: false
    },
    sendPhone: {
        type: Boolean,
        default: false
    },
    no: {
        type: Boolean,
        default: false
    },
    notificationPreferences: {
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        booking: { type: Boolean, default: true },
        payment: { type: Boolean, default: true },
        chat: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false }
    },
    ratingAverage: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    ratingCount: {
        type: Number,
        default: 0,
        min: 0
    },
    role: {
        type: String,
        enum: ['Babysitter', 'Mother', 'Admin'],
        default: 'Mother'
    },
    status: {
        type: String,
        enum: ['Active', 'pendingReview', 'Rejected', 'Suspended'],
        default: 'Active'
    },
    stripeAccountId: {
        type: String,
        default: ''
    },
    payoutAccountStatus: {
        type: String,
        enum: ['not_started', 'pending', 'enabled'],
        default: 'not_started'
    },
    pushTokens: [{
        token: {
            type: String,
            required: true
        },
        platform: {
            type: String,
            default: 'unknown'
        },
        enabled: {
            type: Boolean,
            default: true
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }],
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    }
},
{timestamps: true} 
);

//create model from schema
const User = mongose.model('User', userSchema);

module.exports = User; //export the model to be used in other files