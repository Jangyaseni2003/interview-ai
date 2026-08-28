const multer = require("multer")

const ALLOWED_RESUME_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]

const ALLOWED_AUDIO_MIME_TYPES = [
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/aac",
    "audio/flac"
]

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_RESUME_MIME_TYPES.includes(file.mimetype)) {
            const error = new Error("Only PDF or DOCX files are allowed.")
            error.status = 400
            return cb(error)
        }
        cb(null, true)
    }
})

const uploadAudio = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB, enough for a few minutes of spoken answer
    },
    fileFilter: (req, file, cb) => {
        const baseMimeType = file.mimetype.split(";")[ 0 ].trim()
        if (!ALLOWED_AUDIO_MIME_TYPES.includes(baseMimeType)) {
            const error = new Error("Unsupported audio format.")
            error.status = 400
            return cb(error)
        }
        cb(null, true)
    }
})


module.exports = { upload, uploadAudio }
