import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
    withCredentials: true,
})


/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */
export const generateInterviewReport = async ({ jobDescription, selfDescription, resumeFile }) => {

    const formData = new FormData()
    formData.append("jobDescription", jobDescription)
    formData.append("selfDescription", selfDescription)
    formData.append("resume", resumeFile)

    const response = await api.post("/api/interview/", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })

    return response.data

}


/**
 * @description Service to get interview report by interviewId.
 */
export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(`/api/interview/report/${interviewId}`)

    return response.data
}


/**
 * @description Service to get all interview reports of logged in user.
 */
export const getAllInterviewReports = async () => {
    const response = await api.get("/api/interview/")

    return response.data
}


/**
 * @description Service to generate resume pdf based on user self description, resume content and job description.
 */
export const generateResumePdf = async ({ interviewReportId }) => {
    const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`, null, {
        responseType: "blob"
    })

    return response.data
}


/**
 * @description Service to email the tailored resume pdf to the logged in user.
 */
export const emailResumePdf = async (interviewReportId) => {
    const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}/email`)

    return response.data
}


/**
 * @description Service to regenerate a single section of an existing report.
 */
export const regenerateSection = async (interviewId, section) => {
    const response = await api.patch(`/api/interview/report/${interviewId}/section/${section}`)

    return response.data
}


/**
 * @description Service to toggle completion of a single roadmap task.
 */
export const updateTaskProgress = async (interviewId, dayId, taskId, completed) => {
    const response = await api.patch(`/api/interview/report/${interviewId}/task/${dayId}/${taskId}`, { completed })

    return response.data
}


/**
 * @description Service to submit an answer to a technical/behavioral question and get AI feedback.
 */
export const submitMockAnswer = async (interviewReportId, { questionType, questionIndex, answer }) => {
    const response = await api.post(`/api/interview/report/${interviewReportId}/mock`, { questionType, questionIndex, answer })

    return response.data
}


/**
 * @description Service to get all mock interview attempts for a report.
 */
export const getMockAttempts = async (interviewReportId) => {
    const response = await api.get(`/api/interview/report/${interviewReportId}/mock`)

    return response.data
}


/**
 * @description Service to transcribe a recorded spoken answer (audio blob) to text.
 */
export const transcribeAudio = async (interviewReportId, audioBlob, mimeType) => {
    const formData = new FormData()
    formData.append("audio", audioBlob, `answer.${mimeType.split("/")[ 1 ].split(";")[ 0 ]}`)

    const response = await api.post(`/api/interview/report/${interviewReportId}/mock/transcribe`, formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })

    return response.data
}