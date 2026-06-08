import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI-Powered Review',
    desc: 'Get senior engineer level feedback on your code instantly using advanced LLM analysis.'
  },
  {
    icon: '⚡',
    title: 'Real-Time Execution',
    desc: 'Run your code in a live terminal with real stdin/stdout — exactly like online compilers.'
  },
  {
    icon: '📊',
    title: 'Skill Analytics',
    desc: 'Track your coding improvement over time with score graphs and language breakdowns.'
  },
  {
    icon: '🔍',
    title: 'Complexity Analysis',
    desc: 'Detect O(n²) bottlenecks and get the mathematically optimal algorithm automatically.'
  },
  {
    icon: '🔒',
    title: 'Security Scanner',
    desc: 'Identify SQL injection, XSS, and other vulnerabilities before they reach production.'
  },
  {
    icon: '🔧',
    title: 'Optimized Code',
    desc: 'Get a complete rewrite of your code with the best algorithm, clean naming, and proper structure.'
  },
]

const STEPS = [
  {
    step: '01',
    title: 'Paste Your Code',
    desc: 'Use the VS Code-style Monaco editor. Supports 13+ languages including Java, Python, C++.'
  },
  {
    step: '02',
    title: 'Run It Live',
    desc: 'Execute your code in a real terminal. Type inputs live, see outputs instantly.'
  },
  {
    step: '03',
    title: 'Get AI Review',
    desc: 'Receive detailed feedback — bugs, security issues, complexity analysis, and optimal solution.'
  },
]

const STACK = [
  { name: 'React', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { name: 'Node.js', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { name: 'Express', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
  { name: 'WebSockets', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { name: 'Groq AI', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { name: 'Monaco Editor', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { name: 'JWT Auth', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { name: 'Tailwind CSS', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
]

const STATS = [
  { value: '13+', label: 'Languages Supported' },
  { value: 'O(1)', label: 'Optimal Solutions' },
  { value: '5', label: 'Review Dimensions' },
  { value: '100%', label: 'Free to Use' },
]

function AnimatedCode() {
  const lines = [
    { text: 'for(int i=0; i<n; i++) {', color: 'text-red-400', delay: 0 },
    { text: '  for(int j=0; j<n; j++) {', color: 'text-red-400', delay: 100 },
    { text: '    // O(n²) detected ⚠️', color: 'text-yellow-400', delay: 200 },
    { text: '  }', color: 'text-red-400', delay: 300 },
    { text: '}', color: 'text-red-400', delay: 400 },
    { text: '', color: '', delay: 500 },
    { text: '// ✅ Optimized to O(1)', color: 'text-green-400', delay: 600 },
    { text: 'int count = (int)(Math', color: 'text-green-300', delay: 700 },
    { text: '  .log10(n)) + 1;', color: 'text-green-300', delay: 800 },
  ]

  const [visible, setVisible] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(prev => {
        if (prev >= lines.length) {
          setTimeout(() => setVisible(0), 2000)
          return prev
        }
        return prev + 1
      })
    }, 300)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-gray-950 rounded-2xl p-6 border border-gray-700 font-mono text-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-gray-500 text-xs ml-2">Main.java</span>
      </div>
      <div className="space-y-1 min-h-48">
        {lines.slice(0, visible).map((line, i) => (
          <div key={i} className={`${line.color} transition-all duration-300`}>
            <span className="text-gray-600 mr-4 select-none">{i + 1}</span>
            {line.text}
          </div>
        ))}
        {visible < lines.length && (
          <span className="animate-pulse text-violet-400">▌</span>
        )}
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-gray-950/90 backdrop-blur z-50">
        <h1 className="text-xl font-bold">
          CodeReview<span className="text-violet-400">AI</span>
        </h1>
        <div className="flex items-center gap-3">
          {token ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Go to Dashboard →
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Get Started Free
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs px-3 py-1.5 rounded-full mb-6">
            <span className="animate-pulse">●</span>
            AI-Powered Code Review Platform
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Review code like a
            <span className="text-violet-400"> senior engineer</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            Paste your code and get instant AI feedback on bugs, security vulnerabilities,
            complexity analysis, and the mathematically optimal solution — all in seconds.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => navigate('/register')}
              className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2"
            >
              Start Reviewing Free →
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-3 rounded-xl font-semibold transition"
            >
              Sign In
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-4">No credit card required. Free forever.</p>
        </div>

        <div>
          <AnimatedCode />
          <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">AI Review Result</span>
              <span className="text-xs text-green-400 font-bold">95/100</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[['Security', '98', 'text-green-400'], ['Performance', '95', 'text-green-400'], ['Maintainability', '90', 'text-green-400']].map(([label, score, color]) => (
                <div key={label} className="bg-gray-800 rounded-lg p-2 text-center">
                  <p className={`text-sm font-bold ${color}`}>{score}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-800 py-12">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-violet-400">{s.value}</p>
              <p className="text-sm text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything you need to write better code</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            From complexity analysis to security scanning — get the feedback that takes years of experience to develop.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 hover:border-violet-500/50 rounded-2xl p-6 transition group">
              <span className="text-3xl mb-4 block">{f.icon}</span>
              <h3 className="font-semibold text-gray-100 mb-2 group-hover:text-violet-400 transition">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-900 border-y border-gray-800 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-gray-400">Three steps to better code</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gray-700 -translate-x-4 z-0"></div>
                )}
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-violet-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center mb-4">
                    <span className="text-violet-400 font-bold text-lg">{s.step}</span>
                  </div>
                  <h3 className="font-semibold text-gray-100 mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Built with modern tech</h2>
        <p className="text-gray-400 mb-10">Production-grade stack from frontend to AI layer</p>
        <div className="flex flex-wrap justify-center gap-3">
          {STACK.map(s => (
            <span key={s.name} className={`px-4 py-2 rounded-full text-sm font-medium border ${s.color}`}>
              {s.name}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-violet-600/10 border-y border-violet-500/20 py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to write better code?
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Join developers who use CodeReviewAI to improve their code quality every day.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition"
          >
            Get Started Free →
          </button>
          <p className="text-gray-600 text-sm mt-4">No credit card. No setup. Just better code.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-lg font-bold">
            CodeReview<span className="text-violet-400">AI</span>
          </h1>
          <p className="text-gray-600 text-sm">Built for developers who care about code quality.</p>
          <div className="flex gap-4">
            <button onClick={() => navigate('/login')} className="text-gray-500 hover:text-gray-300 text-sm transition">Login</button>
            <button onClick={() => navigate('/register')} className="text-gray-500 hover:text-gray-300 text-sm transition">Register</button>
          </div>
        </div>
      </footer>

    </div>
  )
}