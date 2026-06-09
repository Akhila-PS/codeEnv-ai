import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Editor from '@monaco-editor/react'
import Terminal from '../components/Terminal'

const LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'typescript', 'go', 'rust', 'php', 'kotlin', 'swift', 'ruby', 'csharp', 'sql']

function ScoreCircle({ score, label }) {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-2xl font-bold ${color}`}>{score}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  )
}

function SeverityBadge({ severity }) {
  const colors = {
    Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    High: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[severity] || colors.Low}`}>
      {severity}
    </span>
  )
}

function TypeBadge({ type }) {
  const colors = {
    Bug: 'bg-red-500/20 text-red-300',
    Security: 'bg-purple-500/20 text-purple-300',
    Performance: 'bg-blue-500/20 text-blue-300',
    Style: 'bg-gray-500/20 text-gray-300',
    Logic: 'bg-orange-500/20 text-orange-300',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[type] || colors.Style}`}>
      {type}
    </span>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('editor')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [viewingHistory, setViewingHistory] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editNote, setEditNote] = useState('')
  const [showTerminal, setShowTerminal] = useState(false)

  useEffect(() => { fetchHistory() }, [])

  const fetchHistory = async () => {
    try {
      const res = await api.get('/history')
      setHistory(res.data)
    } catch {}
  }

  const handleReview = async () => {
    if (!code.trim()) return setError('Please paste some code first')
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.post('/review', { code, language })
      setResult(res.data)
      setActiveTab('result')
      fetchHistory()
    } catch (err) {
      setError(err.response?.data?.error || 'Review failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
  try {
    await api.delete(`/review/${id}`)
    setHistory(prev => prev.filter(h => h.id !== id))
    if (viewingHistory?.id === id) setViewingHistory(null)
  } catch (err) {
    alert('Failed to delete. Try again.')
  }
}

const handleDeleteAll = async () => {
  if (!window.confirm('Delete all history permanently?')) return
  try {
    await api.delete('/history/all')
    setHistory([])
    setViewingHistory(null)
  } catch (err) {
    alert('Failed to delete all. Try again.')
  }
}

  const handleEditSave = (id) => {
    setHistory(prev => prev.map(h => h.id === id ? { ...h, note: editNote } : h))
    setEditingId(null)
    setEditNote('')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Navbar */}
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0 bg-gray-950 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition text-lg"
          >
            ☰
          </button>
          <h1 className="text-lg font-bold">
            CodeReview<span className="text-violet-400">AI</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className=" hover:bg-green-600 text-sm hidden sm:block"> {user.name}</span>
          <button
            onClick={() => navigate('/analytics')}
            className="text-sm bg-gray-800  hover:bg-green-600 px-3 py-1.5 rounded-lg transition hidden sm:block"
          >
             Analytics
          </button>
          <button
            onClick={() => navigate('/github')}
            className="text-sm bg-gray-800 hover:bg-green-600 px-3 py-1.5 rounded-lg transition hidden sm:block"
          >
             GitHub PR
          </button>
          <button
            onClick={() => navigate('/interview')}
            className="text-sm bg-gray-800  hover:bg-green-600 px-3 py-1.5 rounded-lg transition hidden sm:block"
          >
             Interview
          </button>
          <button
            onClick={() => navigate('/learning')}
            className="text-sm bg-gray-800  hover:bg-green-600 px-3 py-1.5 rounded-lg transition hidden sm:block"
          >
             Learn
          </button>
          <button
            onClick={() => navigate('/collab')}
            className="text-sm bg-gray-800  hover:bg-green-600 px-3 py-1.5 rounded-lg transition hidden sm:block"
          >
             Collab
          </button>
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="flex flex-1 relative overflow-hidden">

        {/* Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-20" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed top-0 left-0 h-full w-80 bg-gray-900 border-r border-gray-800 z-30 transform transition-transform duration-300 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-200">Review History</span>
              <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-gray-500 text-sm">No reviews yet</p>
                <p className="text-gray-600 text-xs mt-1">Submit your first code to get started</p>
              </div>
            ) : (
              history.map(h => (
                <div key={h.id} className="bg-gray-800 rounded-xl p-3 border border-gray-700 hover:border-gray-600 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-violet-400 capitalize font-semibold">{h.language}</span>
                    <span className={`text-xs font-bold ${h.score >= 80 ? 'text-green-400' : h.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {h.score}/100
                    </span>
                  </div>

                  {editingId === h.id ? (
                    <div className="mb-2">
                      <input
                        value={editNote}
                        onChange={e => setEditNote(e.target.value)}
                        className="w-full bg-gray-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="Add a note..."
                        autoFocus
                      />
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => handleEditSave(h.id)} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-2 py-1 rounded transition">
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded transition">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                      {h.note || h.summary}
                    </p>
                  )}

                  <p className="text-xs text-gray-600 mb-2">
                    {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>

                  <div className="flex gap-1">
                    <button
                      onClick={() => { setViewingHistory(h); setSidebarOpen(false) }}
                      className="flex-1 text-xs bg-gray-700 hover:bg-violet-600 text-gray-300 hover:text-white px-2 py-1.5 rounded-lg transition"
                    >
                      👁 View
                    </button>
                    <button
                      onClick={() => { setEditingId(h.id); setEditNote(h.note || '') }}
                      className="flex-1 text-xs bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white px-2 py-1.5 rounded-lg transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="flex-1 text-xs bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white px-2 py-1.5 rounded-lg transition"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {history.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-800 shrink-0">
              <button
                onClick={handleDeleteAll}
                className="w-full text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg transition"
              >
                🗑 Clear All History
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-4">

            {/* Viewing history panel */}
            {viewingHistory && (
              <div className="bg-gray-900 border border-violet-500/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-violet-400 font-semibold capitalize">{viewingHistory.language}</span>
                    <span className={`text-sm font-bold ${viewingHistory.score >= 80 ? 'text-green-400' : viewingHistory.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {viewingHistory.score}/100
                    </span>
                  </div>
                  <button
                    onClick={() => setViewingHistory(null)}
                    className="text-gray-400 hover:text-white text-sm bg-gray-800 px-3 py-1 rounded-lg transition"
                  >
                    ✕ Close
                  </button>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{viewingHistory.summary}</p>
                <p className="text-xs text-gray-600 mt-2">
                  Reviewed on {new Date(viewingHistory.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2">
              {['editor', 'result'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  {tab === 'editor' ? '📝 Code Editor' : '🤖 AI Review'}
                </button>
              ))}
            </div>

            {/* Editor Tab */}
            {activeTab === 'editor' && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-200">Paste your code</h2>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl overflow-hidden border border-gray-700">
                  <Editor
                    height="400px"
                    language={language}
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    theme="vs-dark"
                    options={{
                      fontSize: 14,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      tabSize: 2,
                      lineNumbers: 'on',
                      padding: { top: 16, bottom: 16 },
                    }}
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTerminal(true)}
                    disabled={!code.trim()}
                    className="flex-1 bg-gray-800 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    ▶ Run Code
                  </button>
                  <button
                    onClick={handleReview}
                    disabled={loading || !code.trim()}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Analyzing...
                      </>
                    ) : '🚀 Review My Code'}
                  </button>
                </div>
              </div>
            )}

            {/* Result Tab */}
            {activeTab === 'result' && result && (
              <div className="space-y-4">
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

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h3 className="font-semibold text-gray-200 mb-2">Summary</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{result.summary}</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Complexity Rating</p>
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
                  <p className="text-xs text-gray-500 mt-3">{result.complexity?.explanation}</p>
                </div>

                {result.issues?.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="font-semibold text-gray-200 mb-4">Issues Found ({result.issues.length})</h3>
                    <div className="space-y-3">
                      {result.issues.map((issue, i) => (
                        <div key={i} className="bg-gray-800 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <TypeBadge type={issue.type} />
                            <SeverityBadge severity={issue.severity} />
                            {issue.line !== 'N/A' && (
                              <span className="text-xs text-gray-500">Line {issue.line}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-300 mb-1">{issue.description}</p>
                          <p className="text-xs text-gray-500">💡 {issue.fix}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

                {result.improvedCode && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-violet-400">🔧 Optimized Code</h3>
                      <button
                        onClick={() => navigator.clipboard.writeText(result.improvedCode)}
                        className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1 rounded-lg transition"
                      >
                        Copy
                      </button>
                    </div>
                    {result.optimizationExplanation && (
                      <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-4">
                        <p className="text-xs text-violet-300">
                          <span className="font-semibold">Why this is better: </span>
                          {result.optimizationExplanation}
                        </p>
                      </div>
                    )}
                    <pre className="bg-gray-950 rounded-xl p-4 overflow-x-auto text-sm text-green-400 font-mono whitespace-pre-wrap">
                      {result.improvedCode}
                    </pre>
                  </div>
                )}

                <button
                  onClick={() => setActiveTab('editor')}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition"
                >
                  Review Another Code
                </button>
              </div>
            )}

            {activeTab === 'result' && !result && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <p className="text-gray-500">No review yet. Go to the editor and paste your code.</p>
                <button
                  onClick={() => setActiveTab('editor')}
                  className="mt-4 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg text-sm transition"
                >
                  Go to Editor
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {showTerminal && (
        <Terminal
          code={code}
          language={language}
          onClose={() => setShowTerminal(false)}
        />
      )}

    </div>
  )
}