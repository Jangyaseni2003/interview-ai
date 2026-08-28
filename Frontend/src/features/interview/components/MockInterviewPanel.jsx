import React, { useState } from 'react'
import { speakText, isSpeechSynthesisSupported } from '../hooks/useSpeechRecognition.js'
import { useAudioRecorder } from '../hooks/useAudioRecorder.js'
import { transcribeAudio } from '../services/interview.api.js'
import { useParams } from 'react-router'

const MicIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>
)

const SpeakerIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
)

const MockInterviewPanel = ({ report, mockAttempts, mockSubmitting, submitAnswer }) => {
    const { interviewId } = useParams()
    const [ questionType, setQuestionType ] = useState('technical')
    const [ questionIndex, setQuestionIndex ] = useState(0)
    const [ answer, setAnswer ] = useState('')
    const [ latestFeedback, setLatestFeedback ] = useState(null)

    const questions = questionType === 'technical' ? report.technicalQuestions : report.behavioralQuestions
    const currentQuestion = questions[ questionIndex ]

    const attemptsForQuestion = mockAttempts.filter(
        a => a.questionType === questionType && a.questionIndex === questionIndex
    )

    const {
        isSupported: micSupported,
        isRecording,
        isTranscribing,
        error: recordingError,
        startRecording,
        stopRecording
    } = useAudioRecorder({
        onTranscript: async (audioBlob, mimeType) => {
            const response = await transcribeAudio(interviewId, audioBlob, mimeType)
            if (response.transcript) {
                setAnswer(prev => (prev ? prev.trim() + ' ' : '') + response.transcript.trim())
            }
            return response.transcript
        }
    })

    const handleSubmit = async () => {
        if (!answer.trim()) return
        const attempt = await submitAnswer({ questionType, questionIndex, answer })
        if (attempt) {
            setLatestFeedback(attempt.feedback)
            setAnswer('')
        }
    }

    const handleToggleRecording = () => {
        if (isRecording) {
            stopRecording()
        } else {
            startRecording()
        }
    }

    return (
        <section className='mock-panel'>
            <div className='content-header'>
                <h2>Mock Interview</h2>
                <span className='content-header__count'>Practice &amp; get AI feedback</span>
            </div>

            <div className='mock-panel__question-picker'>
                <select
                    value={questionType}
                    onChange={(e) => { setQuestionType(e.target.value); setQuestionIndex(0); setLatestFeedback(null) }}
                >
                    <option value='technical'>Technical</option>
                    <option value='behavioral'>Behavioral</option>
                </select>
                <select
                    value={questionIndex}
                    onChange={(e) => { setQuestionIndex(Number(e.target.value)); setLatestFeedback(null) }}
                >
                    {questions.map((q, i) => (
                        <option key={i} value={i}>Q{i + 1}: {q.question.slice(0, 60)}{q.question.length > 60 ? '…' : ''}</option>
                    ))}
                </select>
            </div>

            {currentQuestion && (
                <div className='mock-panel__question'>
                    <p>{currentQuestion.question}</p>
                    {isSpeechSynthesisSupported && (
                        <button
                            className='mock-panel__icon-btn'
                            title='Read question aloud'
                            onClick={() => speakText(currentQuestion.question)}
                        >
                            {SpeakerIcon}
                        </button>
                    )}
                </div>
            )}

            <div className='mock-panel__answer-wrap'>
                <textarea
                    className='mock-panel__textarea'
                    placeholder='Type your answer, or use the mic to speak it as if in the interview...'
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                />
                {micSupported && (
                    <button
                        className={`mock-panel__mic-btn ${isRecording ? 'mock-panel__mic-btn--recording' : ''} ${isTranscribing ? 'mock-panel__mic-btn--busy' : ''}`}
                        onClick={handleToggleRecording}
                        disabled={isTranscribing}
                        title={isRecording ? 'Stop recording' : 'Answer by voice'}
                    >
                        {isTranscribing ? <span className='mock-panel__spinner' /> : MicIcon}
                        {isRecording && <span className='mock-panel__mic-pulse' />}
                    </button>
                )}
            </div>
            {isRecording && <p className='mock-panel__recording-hint'>Listening... click the mic again to stop and transcribe</p>}
            {isTranscribing && <p className='mock-panel__recording-hint'>Transcribing your answer — this can take up to 20 seconds...</p>}
            {recordingError && <p className='mock-panel__recording-hint mock-panel__recording-hint--muted'>{recordingError}</p>}
            {!micSupported && (
                <p className='mock-panel__recording-hint mock-panel__recording-hint--muted'>
                    Voice input isn't supported in this browser — try Chrome or Edge, or just type your answer.
                </p>
            )}

            <button
                className='button primary-button mock-panel__submit'
                disabled={mockSubmitting || !answer.trim()}
                onClick={handleSubmit}
            >
                {mockSubmitting ? 'Evaluating...' : 'Submit Answer'}
            </button>

            {latestFeedback && (
                <div className='mock-feedback'>
                    <div className='mock-feedback__score'>Score: {latestFeedback.score}/100</div>
                    <div className='mock-feedback__section'>
                        <span className='q-card__tag q-card__tag--answer'>Strengths</span>
                        <ul>{latestFeedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                    <div className='mock-feedback__section'>
                        <span className='q-card__tag q-card__tag--intention'>Improvements</span>
                        <ul>{latestFeedback.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                </div>
            )}

            {attemptsForQuestion.length > 0 && (
                <div className='mock-history'>
                    <p className='mock-history__label'>Past attempts on this question</p>
                    {attemptsForQuestion.map((a) => (
                        <div key={a._id} className='mock-history__item'>
                            <span className='mock-history__score'>{a.feedback.score}/100</span>
                            <span className='mock-history__answer'>{a.answer.slice(0, 100)}{a.answer.length > 100 ? '…' : ''}</span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}

export default MockInterviewPanel
