const pdfParse = require("pdf-parse")
const mammoth = require("mammoth")
const { generateInterviewReport, generateResumePdf, regenerateSection, SECTION_NAMES } = require("../services/ai.service")
const { sendResumePdf } = require("../services/email.service")
const interviewReportModel = require("../models/interviewReport.model")
const userModel = require("../models/user.model")
const catchAsync = require("../utils/catchAsync")

const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

async function extractResumeText(file) {
    if (file.mimetype === DOCX_MIME_TYPE) {
        const result = await mammoth.extractRawText({ buffer: file.buffer })
        return result.value
    }

    const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(file.buffer))).getText()
    return resumeContent.text
}

/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {

    if (!req.file) {
        return res.status(400).json({
            message: "Resume PDF or DOCX file is required."
        })
    }

    const { selfDescription, jobDescription } = req.body

    if (!selfDescription || !jobDescription) {
        return res.status(400).json({
            message: "Please provide selfDescription and jobDescription."
        })
    }

    const resumeText = await extractResumeText(req.file)

    const interViewReportByAi = await generateInterviewReport({
        resume: resumeText,
        selfDescription,
        jobDescription
    })

    const interviewReport = await interviewReportModel.create({
        user: req.user.id,
        resume: resumeText,
        selfDescription,
        jobDescription,
        ...interViewReportByAi
    })

    res.status(201).json({
        message: "Interview report generated successfully.",
        interviewReport
    })

}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/**
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

/**
 * @description Controller to regenerate a single section (technicalQuestions, behavioralQuestions, skillGaps or preparationPlan) of an existing report.
 */
async function regenerateSectionController(req, res) {
    const { interviewId, section } = req.params

    if (!SECTION_NAMES.includes(section)) {
        return res.status(400).json({
            message: `Invalid section. Must be one of: ${SECTION_NAMES.join(", ")}`
        })
    }

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    const sectionData = await regenerateSection({ section, resume, selfDescription, jobDescription })

    interviewReport[ section ] = sectionData
    await interviewReport.save()

    res.status(200).json({
        message: "Section regenerated successfully.",
        interviewReport
    })
}

/**
 * @description Controller to toggle completion of a single roadmap task.
 */
async function updateTaskProgressController(req, res) {
    const { interviewId, dayId, taskId } = req.params
    const { completed } = req.body

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const day = interviewReport.preparationPlan.id(dayId)

    if (!day) {
        return res.status(404).json({
            message: "Preparation plan day not found."
        })
    }

    const task = day.tasks.id(taskId)

    if (!task) {
        return res.status(404).json({
            message: "Task not found."
        })
    }

    task.completed = Boolean(completed)
    await interviewReport.save()

    res.status(200).json({
        message: "Task updated successfully.",
        interviewReport
    })
}

/**
 * @description Controller to email the tailored resume PDF to the logged in user's account email.
 */
async function emailResumePdfController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const user = await userModel.findById(req.user.id)

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

    const { previewUrl } = await sendResumePdf({
        to: user.email,
        pdfBuffer,
        filename: `resume_${interviewReportId}.pdf`
    })

    res.status(200).json({
        message: `Resume emailed to ${user.email}.`,
        previewUrl
    })
}

module.exports = {
    generateInterViewReportController: catchAsync(generateInterViewReportController),
    getInterviewReportByIdController: catchAsync(getInterviewReportByIdController),
    getAllInterviewReportsController: catchAsync(getAllInterviewReportsController),
    generateResumePdfController: catchAsync(generateResumePdfController),
    regenerateSectionController: catchAsync(regenerateSectionController),
    updateTaskProgressController: catchAsync(updateTaskProgressController),
    emailResumePdfController: catchAsync(emailResumePdfController)
}
