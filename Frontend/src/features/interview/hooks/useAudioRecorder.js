import { useRef, useState } from "react"

const CANDIDATE_MIME_TYPES = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
]

const pickSupportedMimeType = () => {
    if (typeof MediaRecorder === "undefined") return null
    return CANDIDATE_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)) || ""
}

export const useAudioRecorder = ({ onTranscript }) => {
    const [ isRecording, setIsRecording ] = useState(false)
    const [ isTranscribing, setIsTranscribing ] = useState(false)
    const [ error, setError ] = useState(null)

    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])
    const streamRef = useRef(null)

    const isSupported = typeof navigator !== "undefined"
        && !!navigator.mediaDevices?.getUserMedia
        && typeof MediaRecorder !== "undefined"

    const startRecording = async () => {
        if (!isSupported || isRecording) return
        setError(null)

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            const mimeType = pickSupportedMimeType()
            const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
            chunksRef.current = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            recorder.onstop = async () => {
                streamRef.current?.getTracks().forEach(track => track.stop())

                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
                setIsTranscribing(true)
                try {
                    const transcript = await onTranscript(blob, recorder.mimeType || "audio/webm")
                    if (!transcript) {
                        setError("Couldn't transcribe that — try again.")
                    }
                } catch (err) {
                    const serverMessage = err.response?.data?.message
                    setError(
                        serverMessage?.includes("high demand") || err.response?.status === 503
                            ? "The AI service is temporarily overloaded — please try again in a moment."
                            : serverMessage || "Couldn't transcribe that — try again."
                    )
                } finally {
                    setIsTranscribing(false)
                }
            }

            mediaRecorderRef.current = recorder
            recorder.start()
            setIsRecording(true)
        } catch (err) {
            setError("Microphone access denied or unavailable.")
        }
    }

    const stopRecording = () => {
        if (!isRecording || !mediaRecorderRef.current) return
        mediaRecorderRef.current.stop()
        setIsRecording(false)
    }

    return { isSupported, isRecording, isTranscribing, error, startRecording, stopRecording }
}
