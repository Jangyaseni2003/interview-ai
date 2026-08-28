const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

const MODEL = "gemini-3.6-flash"

const RETRYABLE_STATUS_CODES = [ 503, 429 ]

async function generateContentWithRetry(params, { retries = 2, delayMs = 800 } = {}) {
    let attempt = 0
    while (true) {
        try {
            return await ai.models.generateContent(params)
        } catch (err) {
            const isRetryable = RETRYABLE_STATUS_CODES.includes(err.status)
            if (!isRetryable || attempt >= retries) {
                throw err
            }
            attempt += 1
            await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
        }
    }
}

const technicalQuestionSchema = z.object({
    question: z.string().describe("The technical question can be asked in the interview"),
    intention: z.string().describe("The intention of interviewer behind asking this question"),
    answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
})

const behavioralQuestionSchema = z.object({
    question: z.string().describe("The behavioral question can be asked in the interview"),
    intention: z.string().describe("The intention of interviewer behind asking this question"),
    answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
})

const skillGapSchema = z.object({
    skill: z.string().describe("The skill which the candidate is lacking"),
    severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
})

const preparationDaySchema = z.object({
    day: z.number().describe("The day number in the preparation plan, starting from 1"),
    focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
    tasks: z.array(z.object({
        text: z.string().describe("A single task to be done on this day, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("List of tasks to be done on this day to follow the preparation plan")
})

const sectionSchemas = {
    technicalQuestions: z.array(technicalQuestionSchema).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(behavioralQuestionSchema).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(skillGapSchema).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(preparationDaySchema).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively")
}

const feedbackSchema = z.object({
    strengths: z.array(z.string()).describe("What the candidate's answer did well"),
    improvements: z.array(z.string()).describe("What the candidate's answer could improve on"),
    score: z.number().describe("A score between 0 and 100 rating the quality of the candidate's answer")
})

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: sectionSchemas.technicalQuestions,
    behavioralQuestions: sectionSchemas.behavioralQuestions,
    skillGaps: sectionSchemas.skillGaps,
    preparationPlan: sectionSchemas.preparationPlan,
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


    const prompt = `Generate an interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}
`

    const response = await generateContentWithRetry({
        model: MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    return JSON.parse(response.text)


}

const SECTION_PROMPTS = {
    technicalQuestions: "Generate a fresh, different set of technical questions",
    behavioralQuestions: "Generate a fresh, different set of behavioral questions",
    skillGaps: "Re-evaluate and generate the skill gaps",
    preparationPlan: "Generate a fresh day-wise preparation plan"
}

async function regenerateSection({ section, resume, selfDescription, jobDescription }) {

    const sectionSchema = sectionSchemas[ section ]

    const prompt = `${SECTION_PROMPTS[ section ]} for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}
`

    const response = await generateContentWithRetry({
        model: MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(z.object({ [ section ]: sectionSchema })),
        }
    })

    return JSON.parse(response.text)[ section ]
}

async function generateMockFeedback({ question, intention, answer, jobDescription }) {

    const prompt = `You are an interviewer evaluating a candidate's spoken answer to an interview question.
                        Job Description: ${jobDescription}
                        Question: ${question}
                        Intention behind the question: ${intention}
                        Candidate's Answer: ${answer}

                        Evaluate the candidate's answer and provide constructive feedback: what the answer did well (strengths), what it could improve on (improvements), and a score from 0 to 100 rating the quality of the answer.
`

    const response = await generateContentWithRetry({
        model: MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(feedbackSchema),
        }
    })

    return JSON.parse(response.text)
}

async function transcribeAudio({ audioBuffer, mimeType }) {

    const response = await generateContentWithRetry({
        model: MODEL,
        contents: [ {
            role: "user",
            parts: [
                { text: "Transcribe the following spoken audio verbatim, as plain text. Do not add any commentary, labels, or formatting — return only the transcription itself." },
                { inlineData: { mimeType, data: audioBuffer.toString("base64") } }
            ]
        } ]
    })

    return response.text.trim()
}



async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    const response = await generateContentWithRetry({
        model: MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

module.exports = {
    generateInterviewReport,
    generateResumePdf,
    regenerateSection,
    generateMockFeedback,
    transcribeAudio,
    SECTION_NAMES: Object.keys(sectionSchemas)
}
