const { generateMockFeedback, transcribeAudio } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")
const mockAttemptModel = require("../models/mockAttempt.model")
const catchAsync = require("../utils/catchAsync")

const QUESTION_FIELD = {
    technical: "technicalQuestions",
    behavioral: "behavioralQuestions"
}

/**
 * @description Controller to submit an answer to a technical/behavioral question and get AI feedback.
 */
async function submitMockAnswerController(req, res) {
    const { interviewReportId } = req.params
    const { questionType, questionIndex, answer } = req.body

    if (!QUESTION_FIELD[ questionType ]) {
        return res.status(400).json({
            message: "questionType must be either 'technical' or 'behavioral'."
        })
    }

    if (!answer || typeof questionIndex !== "number") {
        return res.status(400).json({
            message: "Please provide questionIndex and answer."
        })
    }

    const interviewReport = await interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const questionList = interviewReport[ QUESTION_FIELD[ questionType ] ]
    const targetQuestion = questionList[ questionIndex ]

    if (!targetQuestion) {
        return res.status(404).json({
            message: "Question not found for the given index."
        })
    }

    const feedback = await generateMockFeedback({
        question: targetQuestion.question,
        intention: targetQuestion.intention,
        answer,
        jobDescription: interviewReport.jobDescription
    })

    const mockAttempt = await mockAttemptModel.create({
        interviewReport: interviewReportId,
        user: req.user.id,
        questionType,
        questionIndex,
        question: targetQuestion.question,
        answer,
        feedback
    })

    res.status(201).json({
        message: "Answer evaluated successfully.",
        mockAttempt
    })
}

/**
 * @description Controller to get all mock interview attempts for a report.
 */
async function getMockAttemptsController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const mockAttempts = await mockAttemptModel.find({ interviewReport: interviewReportId, user: req.user.id }).sort({ createdAt: -1 })

    res.status(200).json({
        message: "Mock interview attempts fetched successfully.",
        mockAttempts
    })
}

/**
 * @description Controller to transcribe a recorded spoken answer (audio file) to text.
 */
async function transcribeAudioController(req, res) {
    const { interviewReportId } = req.params

    if (!req.file) {
        return res.status(400).json({
            message: "Audio file is required."
        })
    }

    const interviewReport = await interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const transcript = await transcribeAudio({
        audioBuffer: req.file.buffer,
        mimeType: req.file.mimetype.split(";")[ 0 ].trim()
    })

    res.status(200).json({
        message: "Audio transcribed successfully.",
        transcript
    })
}

module.exports = {
    submitMockAnswerController: catchAsync(submitMockAnswerController),
    getMockAttemptsController: catchAsync(getMockAttemptsController),
    transcribeAudioController: catchAsync(transcribeAudioController)
}
