import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import api from '../api/axios'
import { useNavigate } from 'react-router-dom'

export default function Analytics() {
  const [history, setHistory] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/history').then(res => setHistory(res.data)).catch(() => {})
  }, [])

  const scoreOverTime = history.map((h, i) => ({
    review: `#${history.length - i}`,
    score: h.score,
    language: h.language
  })).reverse()

  const languageStats = history.reduce((acc, h) => {
    if (!acc[h.language]) acc[h.language] = { language: h.language, count: 0, totalScore: 0 }
    acc[h.language].count++
    acc[h.language].totalScore += h.score
    return acc
  }, {})

  const languageData = Object.values(languageStats).map(l => ({
    language: l.language,
    avgScore: Math.round(l.totalScore / l.count),
    reviews: l.count
  }))

  const avgScore = history.length ? Math.round(history.reduce((a, h) => a + h.score, 0) / history.length) : 0
  const bestScore = history.length ? Math.max(...history.map(h => h.score)) : 0
  const totalReviews = history.length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-sm bg-gray-800 px-3 py-1.5 rounded-lg transition">
          ← Back
        </button>
        <h1 className="text-lg font-bold">
          CodeReview<span className="text-violet-400">AI</span>
          <span className="text-gray-400 font-normal text-base ml-2">/ Analytics</span>
        </h1>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-violet-400">{totalReviews}</p>
            <p className="text-xs text-gray-400 mt-1">Total Reviews</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <p className={`text-3xl font-bold ${avgScore >= 80 ? 'text-green-400' : avgScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
              {avgScore}
            </p>
            <p className="text-xs text-gray-400 mt-1">Average Score</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-green-400">{bestScore}</p>
            <p className="text-xs text-gray-400 mt-1">Best Score</p>
          </div>
        </div>

        {/* Score over time */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-200 mb-6">Score Progress Over Time</h2>
          {scoreOverTime.length < 2 ? (
            <p className="text-gray-500 text-sm text-center py-8">Submit at least 2 reviews to see your progress chart</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={scoreOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="review" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Language breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-200 mb-6">Score by Language</h2>
          {languageData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={languageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="language" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="avgScore" fill="#7c3aed" name="Avg Score" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reviews" fill="#0891b2" name="Reviews" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}