const mongose = require('mongoose');
const bcrypt = require('bcryptjs');

const USER_ROLES = ['Mother', 'Babysitter', 'Admin'];

const normalizeRoles = (input) => {
    const values = Array.isArray(input) ? input : [input];
    const normalized = values
      .flatMap((value) => String(value || '')
        .split(',')
        .map((part) => part.trim()))
      .filter(Boolean)
      .map((value) => {
        const cleaned = value.replace(/[_-]/g, ' ');
        const exactRole = USER_ROLES.find((role) => role.toLowerCase() === cleaned.toLowerCase());
        if (exactRole) return exactRole;
        const aliasMap = {
          sitter: 'Babysitter',
          babysitter: 'Babysitter',
          mom: 'Mother',
          mother: 'Mother',
          admin: 'Admin',
        };
        return aliasMap[cleaned.toLowerCase()] || cleaned;
      })
      .filter((value) => USER_ROLES.includes(value))
      .filter((value, index, array) => array.indexOf(value) === index);

    return normalized;
};

const getPrimaryRole = (input, fallback = 'Mother') => {
    const roles = normalizeRoles(input);
    if (roles.length) return roles[0];
    return fallback;
};

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
    roles: {
        type: [String],
        enum: USER_ROLES,
        default: ['Mother'],
    },
    role: {
        type: String,
        enum: USER_ROLES,
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

userSchema.pre('validate', function() {
    const selectedRoles = normalizeRoles(this.roles && this.roles.length ? this.roles : (this.role ? this.role : ['Mother']));
    if (selectedRoles.length === 0) {
        this.roles = ['Mother'];
        this.role = 'Mother';
        return;
    }

    this.roles = selectedRoles;
    this.role = getPrimaryRole(selectedRoles, 'Mother');
});

//create model from schema
const User = mongose.model('User', userSchema);

module.exports = User;
module.exports.USER_ROLES = USER_ROLES;
module.exports.normalizeRoles = normalizeRoles;
module.exports.getPrimaryRole = getPrimaryRole;