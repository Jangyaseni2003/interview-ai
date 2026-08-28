const mongoose = require('mongoose')

const mockAttemptSchema = new mongoose.Schema({
    interviewReport: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InterviewReport",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    questionType: {
        type: String,
        enum: [ "technical", "behavioral" ],
        required: true
    },
    questionIndex: {
        type: Number,
        required: true
    },
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    },
    feedback: {
        strengths: [ String ],
        improvements: [ String ],
        score: Number
    }
}, {
    timestamps: true
})

const mockAttemptModel = mongoose.model("MockAttempt", mockAttemptSchema)

module.exports = mockAttemptModel
