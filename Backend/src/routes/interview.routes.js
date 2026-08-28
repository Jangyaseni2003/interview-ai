const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const interviewController = require("../controllers/interview.controller")
const mockInterviewController = require("../controllers/mockInterview.controller")
const { upload, uploadAudio } = require("../middlewares/file.middleware")
const { checkAiQuota } = require("../middlewares/aiQuota.middleware")

const interviewRouter = express.Router()



/**
 * @route POST /api/interview/
 * @description generate new interview report on the basis of user self description, resume file (PDF/DOCX) and job description.
 * @access private
 */
interviewRouter.post("/", authMiddleware.authUser, checkAiQuota, upload.single("resume"), interviewController.generateInterViewReportController)

/**
 * @route GET /api/interview/report/:interviewId
 * @description get interview report by interviewId.
 * @access private
 */
interviewRouter.get("/report/:interviewId", authMiddleware.authUser, interviewController.getInterviewReportByIdController)


/**
 * @route GET /api/interview/
 * @description get all interview reports of logged in user.
 * @access private
 */
interviewRouter.get("/", authMiddleware.authUser, interviewController.getAllInterviewReportsController)


/**
 * @route POST /api/interview/resume/pdf/:interviewReportId
 * @description generate resume pdf on the basis of user self description, resume content and job description.
 * @access private
 */
interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware.authUser, checkAiQuota, interviewController.generateResumePdfController)


/**
 * @route POST /api/interview/resume/pdf/:interviewReportId/email
 * @description generate the tailored resume pdf and email it to the logged in user.
 * @access private
 */
interviewRouter.post("/resume/pdf/:interviewReportId/email", authMiddleware.authUser, checkAiQuota, interviewController.emailResumePdfController)


/**
 * @route PATCH /api/interview/report/:interviewId/section/:section
 * @description regenerate a single section (technicalQuestions | behavioralQuestions | skillGaps | preparationPlan) of an existing report.
 * @access private
 */
interviewRouter.patch("/report/:interviewId/section/:section", authMiddleware.authUser, checkAiQuota, interviewController.regenerateSectionController)


/**
 * @route PATCH /api/interview/report/:interviewId/task/:dayId/:taskId
 * @description toggle completion of a single roadmap task.
 * @access private
 */
interviewRouter.patch("/report/:interviewId/task/:dayId/:taskId", authMiddleware.authUser, interviewController.updateTaskProgressController)


/**
 * @route POST /api/interview/report/:interviewReportId/mock
 * @description submit an answer to a technical/behavioral question and get AI feedback.
 * @access private
 */
interviewRouter.post("/report/:interviewReportId/mock", authMiddleware.authUser, checkAiQuota, mockInterviewController.submitMockAnswerController)


/**
 * @route GET /api/interview/report/:interviewReportId/mock
 * @description get all mock interview attempts for a report.
 * @access private
 */
interviewRouter.get("/report/:interviewReportId/mock", authMiddleware.authUser, mockInterviewController.getMockAttemptsController)


/**
 * @route POST /api/interview/report/:interviewReportId/mock/transcribe
 * @description transcribe a recorded spoken answer (audio file) to text.
 * @access private
 */
interviewRouter.post("/report/:interviewReportId/mock/transcribe", authMiddleware.authUser, checkAiQuota, uploadAudio.single("audio"), mockInterviewController.transcribeAudioController)



module.exports = interviewRouter
