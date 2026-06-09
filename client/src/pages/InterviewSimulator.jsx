import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import api from '../api/axios'

const LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'typescript', 'go', 'rust', 'php']

const DIFFICULTY_LEVELS = [
  { label: 'Junior', value: 'junior', color: 'text-green-400', desc: 'Basic concepts, simple fixes' },
  { label: 'Mid-level', value: 'mid', color: 'text-yellow-400', desc: 'Design patterns, optimization' },
  { label: 'Senior', value: 'senior', color: 'text-red-400', desc: 'Architecture, scalability, tradeoffs' },
]

function ScoreBadge({ score }) {
  const color = score >= 80 ? 'text-green-400 bg-green-500/10 border-green-500/30' :
    score >= 60 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
    'text-red-400 bg-red-500/10 border-red-500/30'
  const label = score >= 80 ? 'Strong' : score >= 60 ? 'Average' : 'Needs Work'
  return (
    <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${color}`}>
      {score}/100 · {label}
    </span>
  )
}

export default function InterviewSimulator() {
  const navigate = useNavigate()

  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('java')
  const [difficulty, setDifficulty] = useState('mid')
  const [phase, setPhase] = useState('setup') // setup, interviewing, results
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [evaluatingAnswer, setEvaluatingAnswer] = useState(false)
  const [answerFeedback, setAnswerFeedback] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [timerRef, setTimerRef] = useState(null)

  const startInterview = async () => {
    if (!code.trim()) return
    setLoading(true)
    try {
      const res = await api.post('/interview/start', { code, language, difficulty })
      setQuestions(res.data.questions)
      setAnswers([])
      setCurrentQ(0)
      setAnswerFeedback(null)
      setPhase('interviewing')
      startTimer()
    } catch (err) {
      alert('Failed to start interview. Try again.')
    }
    setLoading(false)
  }

  const startTimer = () => {
    setTimeLeft(120)
    const ref = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(ref)
          handleSubmitAnswer(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    setTimerRef(ref)
  }

  const resetTimer = () => {
    if (timerRef) clearInterval(timerRef)
    startTimer()
  }

  const handleSubmitAnswer = async (timedOut = false) => {
    if (timerRef) clearInterval(timerRef)
    const answer = timedOut ? '(No answer — timed out)' : currentAnswer.trim()
    if (!answer && !timedOut) return

    setEvaluatingAnswer(true)
    const newAnswers = [...answers, { question: questions[currentQ], answer }]
    setAnswers(newAnswers)

    try {
      const res = await api.post('/interview/evaluate-answer', {
        code,
        language,
        difficulty,
        question: questions[currentQ],
        answer,
        questionIndex: currentQ
      })
      setAnswerFeedback(res.data)
    } catch {}

    setEvaluatingAnswer(false)
    setCurrentAnswer('')
  }

  const handleNextQuestion = () => {
    setAnswerFeedback(null)
    if (currentQ + 1 >= questions.length) {
      finishInterview()
    } else {
      setCurrentQ(prev => prev + 1)
      resetTimer()
    }
  }

  const finishInterview = async () => {
    setLoading(true)
    setPhase('results')
    try {
      const res = await api.post('/interview/finish', {
        code,
        language,
        difficulty,
        questions,
        answers
      })
      setEvaluation(res.data)
    } catch {}
    setLoading(false)
  }

  const resetInterview = () => {
    setPhase('setup')
    setQuestions([])
    setAnswers([])
    setCurrentQ(0)
    setCurrentAnswer('')
    setEvaluation(null)
    setAnswerFeedback(null)
    if (timerRef) clearInterval(timerRef)
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-sm bg-gray-800 px-3 py-1.5 rounded-lg transition">
          ← Back
        </button>
        <h1 className="text-lg font-bold">
          CodeReview<span className="text-violet-400">AI</span>
          <span className="text-gray-400 font-normal text-base ml-2">/ Interview Simulator</span>
        </h1>
        {phase === 'interviewing' && (
          <div className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-bold ${
            timeLeft <= 30 ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-300'
          }`}>
            ⏱ {formatTime(timeLeft || 0)}
          </div>
        )}
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* SETUP PHASE */}
        {phase === 'setup' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-5xl mb-4">🎯</p>
              <h2 className="text-2xl font-bold mb-2">Interview Simulator</h2>
              <p className="text-gray-400 text-sm max-w-lg mx-auto">
                Paste your code and face 5 real interview questions from an AI senior engineer.
                Get scored on your answers and know if you're interview-ready.
              </p>
            </div>

            {/* Difficulty */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-200 mb-4">Select Interview Level</h3>
              <div className="grid grid-cols-3 gap-3">
                {DIFFICULTY_LEVELS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`p-4 rounded-xl border-2 transition text-left ${
                      difficulty === d.value
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <p className={`font-semibold mb-1 ${d.color}`}>{d.label}</p>
                    <p className="text-xs text-gray-500">{d.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Code Input */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-200">Paste your code</h3>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none"
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="rounded-xl overflow-hidden border border-gray-700">
                <Editor
                  height="300px"
                  language={language}
                  value={code}
                  onChange={v => setCode(v || '')}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    padding: { top: 12 }
                  }}
                />
              </div>
            </div>

            <button
              onClick={startInterview}
              disabled={loading || !code.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition text-lg flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Preparing your interview...
                </>
              ) : '🎯 Start Interview'}
            </button>
          </div>
        )}

        {/* INTERVIEWING PHASE */}
        {phase === 'interviewing' && (
          <div className="space-y-6">

            {/* Progress */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Question {currentQ + 1} of {questions.length}</span>
                <span className="text-xs text-gray-500 capitalize">{difficulty} level</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-violet-600 h-2 rounded-full transition-all"
                  style={{ width: `${((currentQ) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Code reference */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
                <span className="text-xs text-gray-500">Your code ({language})</span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <Editor
                  height="150px"
                  language={language}
                  value={code}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    fontSize: 12,
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    padding: { top: 8 }
                  }}
                />
              </div>
            </div>

            {/* Current Question */}
            {!answerFeedback ? (
              <div className="bg-gray-900 border border-violet-500/30 rounded-2xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0 text-sm font-bold">
                    AI
                  </div>
                  <div>
                    <p className="text-xs text-violet-400 mb-1">Senior Engineer asks:</p>
                    <p className="text-gray-200 leading-relaxed">{questions[currentQ]}</p>
                  </div>
                </div>

                <textarea
                  value={currentAnswer}
                  onChange={e => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here... Explain your thinking clearly."
                  rows={5}
                  className="w-full bg-gray-950 border border-gray-700 text-gray-300 text-sm rounded-xl p-4 focus:outline-none focus:border-violet-500 resize-none"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => handleSubmitAnswer(false)}
                    disabled={evaluatingAnswer || !currentAnswer.trim()}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {evaluatingAnswer ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Evaluating...
                      </>
                    ) : 'Submit Answer →'}
                  </button>
                  <button
                    onClick={() => handleSubmitAnswer(true)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-3 rounded-xl transition text-sm"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ) : (
              /* Answer Feedback */
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-200">Answer Feedback</h3>
                  <ScoreBadge score={answerFeedback.score} />
                </div>

                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Your answer:</p>
                  <p className="text-sm text-gray-300">{answers[answers.length - 1]?.answer}</p>
                </div>

                <div className={`rounded-xl p-4 ${
                  answerFeedback.score >= 70
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-yellow-500/10 border border-yellow-500/20'
                }`}>
                  <p className="text-xs text-gray-400 mb-1">AI Interviewer says:</p>
                  <p className="text-sm text-gray-200 leading-relaxed">{answerFeedback.feedback}</p>
                </div>

                {answerFeedback.idealAnswer && (
                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                    <p className="text-xs text-violet-400 mb-1">Ideal answer would include:</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{answerFeedback.idealAnswer}</p>
                  </div>
                )}

                <button
                  onClick={handleNextQuestion}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition"
                >
                  {currentQ + 1 >= questions.length ? '🏁 Finish Interview' : 'Next Question →'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* RESULTS PHASE */}
        {phase === 'results' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-5xl mb-4">
                {!evaluation ? '⏳' : evaluation.overallScore >= 80 ? '🏆' : evaluation.overallScore >= 60 ? '👍' : '📚'}
              </p>
              <h2 className="text-2xl font-bold mb-2">
                {!evaluation ? 'Calculating results...' : 'Interview Complete!'}
              </h2>
            </div>

            {loading && (
              <div className="text-center py-8">
                <svg className="animate-spin h-8 w-8 text-violet-400 mx-auto" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <p className="text-gray-400 mt-3">AI is evaluating your interview performance...</p>
              </div>
            )}

            {evaluation && (
              <>
                {/* Overall Score */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                  <p className="text-gray-400 text-sm mb-2">Interview Readiness Score</p>
                  <p className={`text-6xl font-bold mb-2 ${
                    evaluation.overallScore >= 80 ? 'text-green-400' :
                    evaluation.overallScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {evaluation.overallScore}
                    <span className="text-2xl text-gray-500">/100</span>
                  </p>
                  <p className="text-gray-300 font-medium">{evaluation.verdict}</p>
                </div>

                {/* Score breakdown */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Technical Knowledge', score: evaluation.technicalScore },
                    { label: 'Communication', score: evaluation.communicationScore },
                    { label: 'Problem Solving', score: evaluation.problemSolvingScore },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                      <p className={`text-2xl font-bold ${s.score >= 80 ? 'text-green-400' : s.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {s.score}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h3 className="font-semibold text-gray-200 mb-3">Overall Assessment</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{evaluation.summary}</p>
                </div>

                {/* Strengths */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="font-semibold text-green-400 mb-3">✅ Strengths</h3>
                    <ul className="space-y-2">
                      {evaluation.strengths?.map((s, i) => (
                        <li key={i} className="text-sm text-gray-400 flex gap-2">
                          <span className="text-green-500 shrink-0">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="font-semibold text-yellow-400 mb-3">📚 Study These</h3>
                    <ul className="space-y-2">
                      {evaluation.studyTopics?.map((s, i) => (
                        <li key={i} className="text-sm text-gray-400 flex gap-2">
                          <span className="text-yellow-500 shrink-0">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Q&A Review */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h3 className="font-semibold text-gray-200 mb-4">Question by Question Review</h3>
                  <div className="space-y-4">
                    {evaluation.questionReviews?.map((qr, i) => (
                      <div key={i} className="bg-gray-800 rounded-xl p-4">
                        <p className="text-xs text-violet-400 mb-1">Q{i + 1}: {qr.question}</p>
                        <p className="text-xs text-gray-400 mb-2">Your answer: {qr.answer}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">{qr.comment}</p>
                          <ScoreBadge score={qr.score} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={resetInterview}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl transition"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}