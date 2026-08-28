export const speakText = (text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
}

export const isSpeechSynthesisSupported = typeof window !== "undefined" && !!window.speechSynthesis
