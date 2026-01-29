const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * School Schema
 * Represents a school entity - the primary tenant in a multi-tenant system
 * Only managed by SUPER_ADMIN role
 */
const SchoolSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },
    phone: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE',
        index: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, { 
    timestamps: true,
    collection: 'schools'
});

module.exports = mongoose.model('School', SchoolSchema);
