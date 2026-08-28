const nodemailer = require("nodemailer")

let transporterPromise = null
let usingEthereal = false

async function getTransporter() {

    if (transporterPromise) {
        return transporterPromise
    }

    if (process.env.SMTP_HOST) {
        transporterPromise = Promise.resolve(nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        }))
        return transporterPromise
    }

    usingEthereal = true
    transporterPromise = nodemailer.createTestAccount().then(testAccount => {
        console.log("No SMTP_HOST configured — using Ethereal test inbox for email sending.")
        return nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        })
    })

    return transporterPromise
}

async function sendResumePdf({ to, pdfBuffer, filename }) {

    const transporter = await getTransporter()

    const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || "Interview AI <no-reply@interview-ai.local>",
        to,
        subject: "Your tailored resume is ready",
        text: "Your AI-tailored resume is attached to this email.",
        attachments: [ {
            filename,
            content: pdfBuffer,
            contentType: "application/pdf"
        } ]
    })

    return {
        previewUrl: usingEthereal ? nodemailer.getTestMessageUrl(info) : null
    }
}

module.exports = { sendResumePdf }
