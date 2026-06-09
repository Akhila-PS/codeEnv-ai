import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const DAY_COLORS = [
  'border-violet-500/30 bg-violet-500/5',
  'border-blue-500/30 bg-blue-500/5',
  'border-cyan-500/30 bg-cyan-500/5',
  'border-green-500/30 bg-green-500/5',
  'border-yellow-500/30 bg-yellow-500/5',
  'border-orange-500/30 bg-orange-500/5',
  'border-red-500/30 bg-red-500/5',
]

const DAY_TEXT = [
  'text-violet-400',
  'text-blue-400',
  'text-cyan-400',
  'text-green-400',
  'text-yellow-400',
  'text-orange-400',
  'text-red-400',
]

export default function LearningPath() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [path, setPath] = useState(null)
  const [completedTopics, setCompletedTopics] = useState(() => {
    const saved = localStorage.getItem('completed_topics')
    return saved ? JSON.parse(saved) : []
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await api.get('/history')
      setHistory(res.data)
    } catch {}
  }

  const generatePath = async () => {
    if (history.length < 2) {
      setError('You need at least 2 code reviews in your history for a personalized learning path.')
      return
    }
    setLoading(true)
    setError('')
    setPath(null)
    try {
      const res = await api.post('/learning/generate', { history })
      setPath(res.data)
    } catch (err) {
      setError('Failed to generate learning path. Try again.')
    }
    setLoading(false)
  }

  const toggleTopic = (topicId) => {
    const updated = completedTopics.includes(topicId)
      ? completedTopics.filter(t => t !== topicId)
      : [...completedTopics, topicId]
    setCompletedTopics(updated)
    localStorage.setItem('completed_topics', JSON.stringify(updated))
  }

  const totalTopics = path?.days?.reduce((acc, d) => acc + d.topics.length, 0) || 0
  const completedCount = path?.days?.reduce((acc, d) =>
    acc + d.topics.filter(t => completedTopics.includes(t.id)).length, 0) || 0
  const progressPercent = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-sm bg-gray-800 px-3 py-1.5 rounded-lg transition">
          ← Back
        </button>
        <h1 className="text-lg font-bold">
          CodeReview<span className="text-violet-400">AI</span>
          <span className="text-gray-400 font-normal text-base ml-2">/ Learning Path</span>
        </h1>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="text-center">
          <p className="text-5xl mb-4">🗺️</p>
          <h2 className="text-2xl font-bold mb-2">Personalized Learning Path</h2>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Based on your code review history, AI identifies your weak areas and creates a personalized 7-day learning plan.
          </p>
        </div>

        {/* Stats from history */}
        {history.length > 0 && !path && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-200 mb-4">Your Review History Analysis</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-violet-400">{history.length}</p>
                <p className="text-xs text-gray-400 mt-1">Total Reviews</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">
                  {history.length > 0 ? Math.round(history.reduce((a, h) => a + h.score, 0) / history.length) : 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">Average Score</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-400">
                  {[...new Set(history.map(h => h.language))].length}
                </p>
                <p className="text-xs text-gray-400 mt-1">Languages Used</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {[...new Set(history.map(h => h.language))].map(lang => (
                <span key={lang} className="text-xs bg-violet-500/20 text-violet-300 px-3 py-1 rounded-full capitalize">
                  {lang}
                </span>
              ))}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <button
              onClick={generatePath}
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Analyzing your code patterns...
                </>
              ) : '🗺️ Generate My Learning Path'}
            </button>
          </div>
        )}

        {history.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <p className="text-gray-500 mb-4">No review history found.</p>
            <p className="text-gray-600 text-sm mb-4">Submit at least 2 code reviews first to get a personalized learning path.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg text-sm transition"
            >
              Go Review Code
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <svg className="animate-spin h-8 w-8 text-violet-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-gray-400">Analyzing your code patterns and generating personalized plan...</p>
            <p className="text-gray-600 text-xs mt-2">This may take 10-15 seconds</p>
          </div>
        )}

        {/* Learning Path */}
        {path && !loading && (
          <div className="space-y-6">

            {/* Summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-100 text-lg">{path.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">{path.summary}</p>
                </div>
                <button
                  onClick={() => { setPath(null); setCompletedTopics([]) }}
                  className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800 px-3 py-1.5 rounded-lg transition shrink-0 ml-4"
                >
                  Regenerate
                </button>
              </div>

              {/* Progress bar */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">Your progress</span>
                <span className="text-xs text-violet-400 font-semibold">{completedCount}/{totalTopics} topics</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 mb-1">
                <div
                  className="bg-violet-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 text-right">{progressPercent}% complete</p>

              {/* Weak areas */}
              {path.weakAreas?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Identified weak areas:</p>
                  <div className="flex flex-wrap gap-2">
                    {path.weakAreas.map((area, i) => (
                      <span key={i} className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-full">
                        ⚠️ {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 7 Day Plan */}
            {path.days?.map((day, i) => (
              <div key={i} className={`bg-gray-900 border rounded-2xl p-6 ${DAY_COLORS[i % DAY_COLORS.length]}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${DAY_TEXT[i % DAY_TEXT.length]}`}>
                      Day {day.day}
                    </span>
                    <h3 className="font-semibold text-gray-200 mt-0.5">{day.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{day.focus}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-gray-500">{day.topics.filter(t => completedTopics.includes(t.id)).length}/{day.topics.length} done</p>
                    <p className="text-xs text-gray-600">{day.estimatedTime}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {day.topics.map((topic) => {
                    const done = completedTopics.includes(topic.id)
                    return (
                      <div
                        key={topic.id}
                        onClick={() => toggleTopic(topic.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition ${
                          done ? 'bg-green-500/10 border border-green-500/20' : 'bg-gray-800 hover:bg-gray-750'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                          done ? 'bg-green-500 border-green-500' : 'border-gray-600'
                        }`}>
                          {done && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`text-sm font-medium ${done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                              {topic.title}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              topic.type === 'concept' ? 'bg-blue-500/20 text-blue-300' :
                              topic.type === 'practice' ? 'bg-green-500/20 text-green-300' :
                              'bg-yellow-500/20 text-yellow-300'
                            }`}>
                              {topic.type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{topic.description}</p>
                          {topic.resource && (
                            <p className="text-xs text-violet-400 mt-1">📖 {topic.resource}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {progressPercent === 100 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">🎉</p>
                <h3 className="text-xl font-bold text-green-400 mb-2">Learning Path Complete!</h3>
                <p className="text-gray-400 text-sm">You've completed all topics. Generate a new path to keep improving!</p>
                <button
                  onClick={() => { setPath(null); setCompletedTopics([]) }}
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm transition"
                >
                  Generate New Path
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}