import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

function ScoreCircle({ score, label }) {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-2xl font-bold ${color}`}>{score}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  )
}

export default function GithubReview() {
  const navigate = useNavigate()
  const [prUrl, setPrUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleReview = async () => {
    if (!prUrl.trim()) return setError('Please enter a GitHub PR URL')
    if (!prUrl.includes('github.com') || !prUrl.includes('/pull/')) {
      return setError('Invalid URL. Format: https://github.com/owner/repo/pull/123')
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await api.post('/github/pr', { prUrl })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to review PR. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white text-sm bg-gray-800 px-3 py-1.5 rounded-lg transition"
        >
          ← Back
        </button>
        <h1 className="text-lg font-bold">
          CodeReview<span className="text-violet-400">AI</span>
          <span className="text-gray-400 font-normal text-base ml-2">/ GitHub PR Review</span>
        </h1>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Input */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-200 mb-1">GitHub Pull Request Review</h2>
            <p className="text-xs text-gray-500">Paste any public GitHub PR URL and get an instant AI review of the code changes.</p>
          </div>

          <div className="flex gap-3">
            <input
              value={prUrl}
              onChange={e => setPrUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReview()}
              placeholder="https://github.com/owner/repo/pull/123"
              className="flex-1 bg-gray-950 border border-gray-700 text-gray-300 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={handleReview}
              disabled={loading || !prUrl.trim()}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              {loading ? '...' : 'Review PR'}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-500 font-medium mb-2">Example PRs you can try:</p>
            <div className="space-y-1">
              {[
                'https://github.com/facebook/react/pull/31000',
                'https://github.com/vercel/next.js/pull/60000',
              ].map(url => (
                <button
                  key={url}
                  onClick={() => setPrUrl(url)}
                  className="block text-xs text-violet-400 hover:text-violet-300 transition text-left"
                >
                  {url}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Fetching PR diff and analyzing with AI...</p>
            <p className="text-gray-600 text-xs mt-2">This may take 10-15 seconds</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">

            {/* PR Info */}
            {result.prDetails && (
              <div className="bg-gray-900 border border-violet-500/30 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-violet-400 mb-1">{result.prDetails.title}</h3>
                    <p className="text-xs text-gray-500">by @{result.prDetails.author}</p>
                  </div>
                  
                    <a href={result.prDetails.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition"
                  >
                    View on GitHub ↗
                  </a>
                </div>
                {result.prDetails.description && (
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed line-clamp-3">
                    {result.prDetails.description}
                  </p>
                )}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    ['Files', result.prDetails.changedFiles],
                    ['Added', `+${result.prDetails.additions}`],
                    ['Removed', `-${result.prDetails.deletions}`],
                    ['Language', result.prDetails.language],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-sm font-bold text-gray-200">{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-gray-200">Overall Score</h2>
                <span className={`text-4xl font-bold ${result.overallScore >= 80 ? 'text-green-400' : result.overallScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {result.overallScore}/100
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 border-t border-gray-800 pt-4">
                <ScoreCircle score={result.securityScore} label="Security" />
                <ScoreCircle score={result.maintainabilityScore} label="Maintainability" />
                <ScoreCircle score={result.performanceScore} label="Performance" />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-200 mb-2">Summary</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{result.summary}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Complexity</p>
                  <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                    {result.complexity?.rating}
                  </span>
                </div>
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Current → Optimal</p>
                  <p className="text-xs">
                    <span className="text-red-400">{result.complexity?.current}</span>
                    <span className="text-gray-500"> → </span>
                    <span className="text-green-400">{result.complexity?.optimal}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Issues */}
            {result.issues?.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-200 mb-4">Issues Found ({result.issues.length})</h3>
                <div className="space-y-3">
                  {result.issues.map((issue, i) => (
                    <div key={i} className="bg-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">{issue.type}</span>
                        <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">{issue.severity}</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-1">{issue.description}</p>
                      <p className="text-xs text-gray-500">💡 {issue.fix}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-semibold text-green-400 mb-3">✅ Strengths</h3>
                <ul className="space-y-2">
                  {result.strengths?.map((s, i) => (
                    <li key={i} className="text-sm text-gray-400 flex gap-2">
                      <span className="text-green-500 shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-semibold text-yellow-400 mb-3">⚡ Improvements</h3>
                <ul className="space-y-2">
                  {result.improvements?.map((s, i) => (
                    <li key={i} className="text-sm text-gray-400 flex gap-2">
                      <span className="text-yellow-500 shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => { setResult(null); setPrUrl('') }}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition"
            >
              Review Another PR
            </button>
          </div>
        )}
      </div>
    </div>
  )
}