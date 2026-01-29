const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * StudentClassroom Schema (Enrollment & Transfer History)
 */
const StudentClassroomSchema = new Schema({
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    classroomId: {
        type: Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true
    },
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    startDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    endDate: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    reason: {
        type: String,
        enum: ['ENROLLMENT', 'TRANSFER', 'GRADUATION', 'WITHDRAWAL'],
        default: 'ENROLLMENT'
    },
    notes: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { 
    timestamps: true,
    collection: 'student_classrooms'
});

// Compound indexes for performance
StudentClassroomSchema.index({ studentId: 1, isActive: 1 });
StudentClassroomSchema.index({ classroomId: 1, isActive: 1 });
StudentClassroomSchema.index({ schoolId: 1, isActive: 1 });
StudentClassroomSchema.index({ studentId: 1, startDate: -1 });

module.exports = mongoose.model('StudentClassroom', StudentClassroomSchema);
