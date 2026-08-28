import {
    getAllInterviewReports,
    generateInterviewReport,
    getInterviewReportById,
    generateResumePdf,
    emailResumePdf,
    regenerateSection,
    updateTaskProgress,
    submitMockAnswer,
    getMockAttempts
} from "../services/interview.api"
import { useContext, useEffect, useState } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context

    const [ regeneratingSection, setRegeneratingSection ] = useState(null)
    const [ emailStatus, setEmailStatus ] = useState(null)
    const [ mockAttempts, setMockAttempts ] = useState([])
    const [ mockSubmitting, setMockSubmitting ] = useState(false)

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (error) {
            return null
        } finally {
            setLoading(false)
        }
    }

    const getReportById = async (interviewId) => {
        setLoading(true)
        try {
            const response = await getInterviewReportById(interviewId)
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (error) {
            return null
        } finally {
            setLoading(false)
        }
    }

    const getReports = async () => {
        setLoading(true)
        try {
            const response = await getAllInterviewReports()
            setReports(response.interviewReports)
            return response.interviewReports
        } catch (error) {
            return null
        } finally {
            setLoading(false)
        }
    }

    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        try {
            const response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([ response ], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
        }
        catch (error) {
            // ignore: pdf download failed, loading state already resets in finally
        } finally {
            setLoading(false)
        }
    }

    const emailPdf = async (interviewReportId) => {
        setEmailStatus({ status: "sending" })
        try {
            const response = await emailResumePdf(interviewReportId)
            setEmailStatus({ status: "sent", message: response.message, previewUrl: response.previewUrl })
        } catch (error) {
            setEmailStatus({ status: "error", message: error.response?.data?.message || "Failed to email resume." })
        }
    }

    const regenerate = async (interviewIdArg, section) => {
        setRegeneratingSection(section)
        try {
            const response = await regenerateSection(interviewIdArg, section)
            setReport(response.interviewReport)
            return true
        } catch (error) {
            return false
        } finally {
            setRegeneratingSection(null)
        }
    }

    const toggleTask = async (interviewIdArg, dayId, taskId, completed) => {
        // optimistic update
        setReport(prev => {
            if (!prev) return prev
            return {
                ...prev,
                preparationPlan: prev.preparationPlan.map(day =>
                    day._id === dayId
                        ? { ...day, tasks: day.tasks.map(task => task._id === taskId ? { ...task, completed } : task) }
                        : day
                )
            }
        })

        try {
            await updateTaskProgress(interviewIdArg, dayId, taskId, completed)
        } catch (error) {
            // revert on failure
            setReport(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    preparationPlan: prev.preparationPlan.map(day =>
                        day._id === dayId
                            ? { ...day, tasks: day.tasks.map(task => task._id === taskId ? { ...task, completed: !completed } : task) }
                            : day
                    )
                }
            })
        }
    }

    const fetchMockAttempts = async (interviewReportId) => {
        try {
            const response = await getMockAttempts(interviewReportId)
            setMockAttempts(response.mockAttempts)
        } catch (error) {
            // ignore
        }
    }

    const submitAnswer = async (interviewReportId, { questionType, questionIndex, answer }) => {
        setMockSubmitting(true)
        try {
            const response = await submitMockAnswer(interviewReportId, { questionType, questionIndex, answer })
            setMockAttempts(prev => [ response.mockAttempt, ...prev ])
            return response.mockAttempt
        } catch (error) {
            return null
        } finally {
            setMockSubmitting(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
            fetchMockAttempts(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId ])

    return {
        loading, report, reports,
        generateReport, getReportById, getReports, getResumePdf,
        emailPdf, emailStatus,
        regenerate, regeneratingSection,
        toggleTask,
        mockAttempts, mockSubmitting, submitAnswer, fetchMockAttempts
    }

}
