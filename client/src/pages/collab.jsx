import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import Terminal from '../components/Terminal'

const LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'typescript', 'go', 'rust', 'php']

const FILE_ICONS = {
  js: '🟨', jsx: '🟨', ts: '🔷', tsx: '🔷',
  py: '🐍', java: '☕', cpp: '⚙️', c: '⚙️',
  go: '🔵', rs: '🦀', php: '🐘', rb: '💎',
  html: '🌐', css: '🎨', json: '📋',
  md: '📝', txt: '📄', default: '📄'
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  return FILE_ICONS[ext] || FILE_ICONS.default
}

function getLanguageFromFile(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript',
    tsx: 'typescript', py: 'python', java: 'java',
    cpp: 'cpp', c: 'cpp', go: 'go', rs: 'rust',
    php: 'php', rb: 'ruby', cs: 'csharp', html: 'html',
    css: 'css', json: 'json', md: 'markdown'
  }
  return map[ext] || 'javascript'
}

const DEFAULT_FILES = [
  { id: '1', name: 'Main.java', content: '// Start coding together!\npublic class Main {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println("Hello, World!");\n\t}\n}', folder: null },
  { id: '2', name: 'Solution.py', content: '# Python solution\ndef main():\n    print("Hello, World!")\n\nmain()', folder: null },
]

export default function Collab() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [roomId, setRoomId] = useState('')
  const [joined, setJoined] = useState(false)
  const [users, setUsers] = useState([])
  const [myUserId, setMyUserId] = useState('')
  const [notification, setNotification] = useState('')

  const [files, setFiles] = useState(DEFAULT_FILES)
  const [openTabs, setOpenTabs] = useState(['1'])
  const [activeTab, setActiveTab] = useState('1')
  const [renamingFile, setRenamingFile] = useState(null)
  const [newFileName, setNewFileName] = useState('')
  const [creatingFile, setCreatingFile] = useState(false)
  const [newFileInput, setNewFileInput] = useState('')

  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatOpen, setChatOpen] = useState(true)
  const [terminalOpen, setTerminalOpen] = useState(false)

  const [aiThinking, setAiThinking] = useState(false)
  const [aiEditMode, setAiEditMode] = useState(false)
  const [aiDiff, setAiDiff] = useState(null)
  const [aiEditLoading, setAiEditLoading] = useState(false)
  const [conflictWarning, setConflictWarning] = useState([])

  const lastAiCheck = useRef(Date.now())
  const aiCheckInterval = useRef(null)
  const wsRef = useRef(null)
  const chatBottomRef = useRef(null)

  const activeFile = files.find(f => f.id === activeTab)
  const activeLanguage = activeFile ? getLanguageFromFile(activeFile.name) : 'javascript'

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const roomFromUrl = searchParams.get('room')
    if (roomFromUrl) setRoomId(roomFromUrl)
  }, [searchParams])

  useEffect(() => {
    if (!joined) return
    let aiHasFiredOnce = false
    aiCheckInterval.current = setInterval(() => {
      if (aiHasFiredOnce) return
      const timeSinceLastCheck = Date.now() - lastAiCheck.current
      const codeLength = activeFile?.content?.trim().length || 0
      if (timeSinceLastCheck >= 90000 && codeLength > 100) {
        runAiObserver(activeFile.content, activeLanguage)
        lastAiCheck.current = Date.now()
        aiHasFiredOnce = true
      }
    }, 15000)
    return () => clearInterval(aiCheckInterval.current)
  }, [joined, activeFile, activeLanguage])

  const showNotification = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  const addSystemMessage = (text, type = 'system') => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random(),
      userId: 'system',
      userName: type === 'ai' ? '🤖 AI Mentor' : '🔔 System',
      text,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      type
    }])
  }

  const runAiObserver = async (code, language) => {
    if (!code || code.trim().length < 50) return
    setAiThinking(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/collab/ai-observe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code, language, trigger: 'auto' })
      })
      const data = await response.json()
      if (data.observation) {
        addSystemMessage(data.observation, 'ai')
        if (wsRef.current?.readyState === 1) {
          wsRef.current.send(JSON.stringify({
            type: 'collab:ai_observation',
            observation: data.observation
          }))
        }
      }
    } catch {}
    setAiThinking(false)
  }

  const handleAiCommand = async (text) => {
    const code = activeFile?.content || ''
    setAiThinking(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/collab/ai-observe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          code,
          language: activeLanguage,
          trigger: 'manual',
          question: text.replace('@ai', '').trim()
        })
      })
      const data = await response.json()
      if (data.observation) addSystemMessage(data.observation, 'ai')
    } catch {
      addSystemMessage('Sorry, I could not analyze the code right now.', 'ai')
    }
    setAiThinking(false)
  }

  const handleAiEdit = async (instruction) => {
    if (!activeFile) return
    setAiEditLoading(true)
    addSystemMessage(`✏️ AI is rewriting your code: "${instruction}"`, 'ai')
    try {
      const response = await fetch(fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/collab/ai-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeLanguage,
          instruction
        })
      })
      const data = await response.json()
      if (data.newCode) {
        setAiDiff({
          original: activeFile.content,
          suggested: data.newCode,
          explanation: data.explanation
        })
        addSystemMessage('✅ AI finished rewriting. Review the changes and Accept or Reject.', 'ai')
      }
    } catch {
      addSystemMessage('Sorry, AI edit failed. Try again.', 'ai')
    }
    setAiEditLoading(false)
  }

  const acceptAiEdit = () => {
    if (!aiDiff) return
    handleCodeChange(aiDiff.suggested)
    setAiDiff(null)
    addSystemMessage('✅ AI changes accepted and applied to the editor.', 'ai')
  }

  const rejectAiEdit = () => {
    setAiDiff(null)
    addSystemMessage('❌ AI changes rejected. Your original code is kept.', 'ai')
  }

  const connectToRoom = (id) => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000'
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'collab:join',
        roomId: id,
        userId: user.id,
        userName: user.name || 'Anonymous'
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'collab:init') {
        if (data.files) setFiles(data.files)
        setMessages(data.messages || [])
        setUsers(data.users || [])
        setMyUserId(data.userId)
        setJoined(true)
        addSystemMessage(`Welcome to room ${id}! Share the room code with your partner.`, 'system')
        setTimeout(() => {
          addSystemMessage('👋 Hi! I\'m your AI Mentor. I\'ll watch your code and help when needed. Type @ai for questions or use the AI Edit tab to rewrite code!', 'ai')
        }, 1500)
      }

      if (data.type === 'collab:file_change') {
        setFiles(prev => prev.map(f =>
          f.id === data.fileId ? { ...f, content: data.content } : f
        ))
      }

      if (data.type === 'collab:files_update') {
        setFiles(data.files)
      }

      if (data.type === 'collab:user_joined') {
        setUsers(data.users)
        showNotification(`${data.user.name} joined`)
        addSystemMessage(`${data.user.name} joined the room`, 'system')
      }

      if (data.type === 'collab:user_left') {
        setUsers(data.users)
        addSystemMessage(`${data.userName} left the room`, 'system')
      }

      if (data.type === 'collab:message') {
        setMessages(prev => [...prev, data.message])
      }

      if (data.type === 'collab:ai_observation') {
        addSystemMessage(data.observation, 'ai')
      }

      if (data.type === 'collab:conflict_warning') {
      setConflictWarning(data.conflicts)
}
    }

    ws.onerror = () => showNotification('Connection error.')
    ws.onclose = () => { if (joined) showNotification('Disconnected.') }
  }

  const handleJoin = () => { if (roomId.trim()) connectToRoom(roomId.trim().toUpperCase()) }

  const handleCreateRoom = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomId(id)
    connectToRoom(id)
  }

  const handleCodeChange = useCallback((value) => {
    const newContent = value || ''
    setFiles(prev => prev.map(f => f.id === activeTab ? { ...f, content: newContent } : f))
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'collab:file_change',
        fileId: activeTab,
        content: newContent
      }))
    }
  }, [activeTab])

  const handleSendMessage = () => {
    if (!chatInput.trim()) return
    const isAiCommand = chatInput.toLowerCase().includes('@ai')
    if (isAiCommand) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        userId: myUserId,
        userName: user.name,
        text: chatInput,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: 'user'
      }])
      handleAiCommand(chatInput)
      setChatInput('')
      return
    }
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'collab:message', text: chatInput.trim() }))
    }
    setChatInput('')
  }

  const openFile = (fileId) => {
    setActiveTab(fileId)
    if (!openTabs.includes(fileId)) setOpenTabs(prev => [...prev, fileId])
  }

  const closeTab = (fileId, e) => {
    e.stopPropagation()
    const newTabs = openTabs.filter(t => t !== fileId)
    setOpenTabs(newTabs)
    if (activeTab === fileId) setActiveTab(newTabs[newTabs.length - 1] || null)
  }

  const createFile = () => {
    if (!newFileInput.trim()) return
    const newFile = { id: Date.now().toString(), name: newFileInput.trim(), content: '', folder: null }
    const updatedFiles = [...files, newFile]
    setFiles(updatedFiles)
    setCreatingFile(false)
    setNewFileInput('')
    openFile(newFile.id)
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'collab:files_update', files: updatedFiles }))
    }
  }

  const deleteFile = (fileId) => {
    const updatedFiles = files.filter(f => f.id !== fileId)
    setFiles(updatedFiles)
    const newTabs = openTabs.filter(t => t !== fileId)
    setOpenTabs(newTabs)
    if (activeTab === fileId) setActiveTab(newTabs[0] || null)
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'collab:files_update', files: updatedFiles }))
    }
  }

  const renameFile = (fileId) => {
    if (!newFileName.trim()) return
    const updatedFiles = files.map(f => f.id === fileId ? { ...f, name: newFileName.trim() } : f)
    setFiles(updatedFiles)
    setRenamingFile(null)
    setNewFileName('')
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'collab:files_update', files: updatedFiles }))
    }
  }

  const handleLeave = async () => {
    if (activeFile) {
      addSystemMessage('Generating session summary...', 'ai')
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/collab/ai-observe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ code: activeFile.content, language: activeLanguage, trigger: 'session_end' })
        })
        const data = await response.json()
        if (data.observation) addSystemMessage(data.observation, 'ai')
      } catch {}
    }
    if (wsRef.current) wsRef.current.close()
    setJoined(false)
    setRoomId('')
  }

  const copyRoomLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/collab?room=${roomId}`)
    showNotification('Room link copied!')
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <nav className="border-b border-gray-800 px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-sm bg-gray-800 px-3 py-1.5 rounded-lg transition">← Back</button>
          <h1 className="text-lg font-bold">CodeReview<span className="text-violet-400">AI</span> <span className="text-gray-400 font-normal text-sm">/ Collab Editor</span></h1>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md space-y-4">
            <div className="text-center mb-8">
              <p className="text-5xl mb-4">👥</p>
              <h2 className="text-2xl font-bold mb-2">Collaborative IDE</h2>
              <p className="text-gray-400 text-sm">VS Code style editor with real-time collaboration, file system, terminal and AI Mentor.</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <button onClick={handleCreateRoom} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition">✨ Create New Room</button>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-700"></div>
                <span className="text-gray-500 text-xs">or join existing</span>
                <div className="flex-1 h-px bg-gray-700"></div>
              </div>
              <div className="flex gap-2">
                <input
                  value={roomId}
                  onChange={e => setRoomId(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder="Room Code (e.g. AB12CD)"
                  className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500 font-mono tracking-widest uppercase"
                  maxLength={6}
                />
                <button onClick={handleJoin} disabled={!roomId.trim()} className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl transition">Join</button>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium mb-2">Features:</p>
              <div className="grid grid-cols-2 gap-2">
                {['📁 File Explorer', '📑 Multiple Tabs', '💻 Live Terminal', '🤖 AI Mentor', '💬 Team Chat', '⚡ Real-time Sync', '✏️ AI Code Edit', '🔀 Diff View'].map(f => (
                  <div key={f} className="text-xs text-gray-400">{f}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">

      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white text-sm px-6 py-2 rounded-full shadow-lg">
          {notification}
        </div>
      )}

      {/* Title bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={handleLeave} className="text-gray-400 hover:text-red-400 text-xs bg-gray-800 px-2 py-1 rounded transition">✕ Leave</button>
          <h1 className="text-sm font-bold">CodeReview<span className="text-violet-400">AI</span> IDE</h1>
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded">
            <span className="text-xs text-gray-400">Room:</span>
            <span className="text-xs font-mono font-bold text-violet-400">{roomId}</span>
            <button onClick={copyRoomLink} className="text-xs text-gray-500 hover:text-gray-300 ml-1">📋</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {users.map(u => (
            <div key={u.id} title={u.name} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: u.color }}>
              {u.name[0]?.toUpperCase()}
            </div>
          ))}
          <span className="text-xs text-gray-500">{users.length} online</span>
          <button onClick={() => setTerminalOpen(!terminalOpen)} className={`text-xs px-3 py-1 rounded transition ${terminalOpen ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
            💻 Terminal
          </button>
          <button onClick={() => setChatOpen(!chatOpen)} className={`text-xs px-3 py-1 rounded transition ${chatOpen ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
            {aiThinking ? '🤖 thinking...' : '💬 Chat'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* File Explorer */}
        <div className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Explorer</span>
            <button onClick={() => setCreatingFile(true)} className="text-gray-400 hover:text-white text-lg leading-none" title="New File">+</button>
          </div>

          {creatingFile && (
            <div className="px-3 py-2 border-b border-gray-800">
              <input
                value={newFileInput}
                onChange={e => setNewFileInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createFile()
                  if (e.key === 'Escape') { setCreatingFile(false); setNewFileInput('') }
                }}
                placeholder="filename.java"
                className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                autoFocus
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="px-2 py-1">
              <div className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 uppercase tracking-wider">
                <span>📁</span> Project
              </div>
              {files.map(file => (
                <div key={file.id} className="group">
                  {renamingFile === file.id ? (
                    <input
                      value={newFileName}
                      onChange={e => setNewFileName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') renameFile(file.id)
                        if (e.key === 'Escape') setRenamingFile(null)
                      }}
                      className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => openFile(file.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer text-xs transition ${activeTab === file.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
                    >
                      <span>{getFileIcon(file.name)}</span>
                      <span className="flex-1 truncate">{file.name}</span>
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button onClick={e => { e.stopPropagation(); setRenamingFile(file.id); setNewFileName(file.name) }} className="text-gray-500 hover:text-gray-300 text-xs" title="Rename">✏️</button>
                        <button onClick={e => { e.stopPropagation(); deleteFile(file.id) }} className="text-gray-500 hover:text-red-400 text-xs" title="Delete">🗑</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tabs */}
          <div className="bg-gray-900 border-b border-gray-800 flex items-center overflow-x-auto shrink-0">
            {openTabs.map(tabId => {
              const file = files.find(f => f.id === tabId)
              if (!file) return null
              return (
                <div
                  key={tabId}
                  onClick={() => setActiveTab(tabId)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs cursor-pointer border-r border-gray-800 shrink-0 transition ${activeTab === tabId ? 'bg-gray-950 text-white border-t-2 border-t-violet-500' : 'text-gray-400 hover:bg-gray-800'}`}
                >
                  <span>{getFileIcon(file.name)}</span>
                  <span>{file.name}</span>
                  <button onClick={e => closeTab(tabId, e)} className="text-gray-600 hover:text-gray-300 ml-1">×</button>
                </div>
              )
            })}
            {openTabs.length === 0 && (
              <div className="px-4 py-2 text-xs text-gray-600">No files open — click a file to open it</div>
            )}
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden relative">
  {conflictWarning.length > 0 && (
    <div className="absolute top-2 right-2 z-50 bg-yellow-900/90 border border-yellow-500 rounded-lg p-3 max-w-xs">
      <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm mb-1">
        ⚠️ Conflict Predicted!
      </div>
      {conflictWarning.map((c, i) => (
        <div key={i} className="text-yellow-200 text-xs">
          <span style={{ color: c.userA.color }}>{c.userA.name}</span>
          {' & '}
          <span style={{ color: c.userB.color }}>{c.userB.name}</span>
          {' → lines '}
          {c.lines.join(', ')}
        </div>
      ))}
      <button onClick={() => setConflictWarning([])} className="text-yellow-500 text-xs mt-1 hover:text-white">
        Dismiss
      </button>
    </div>
  )}
  {activeFile ? (
    <Editor
                height="100%"
                language={activeLanguage}
                value={activeFile.content}
                onChange={handleCodeChange}
                onMount={(editor) => {
                  editor.onDidChangeCursorPosition((e) => {
                    wsRef.current?.readyState === 1 && wsRef.current.send(JSON.stringify({
                      type: 'collab:cursor_move',
                      line: e.position.lineNumber,
                      ch: e.position.column
                    }))
                  })
                  editor.onDidChangeModelContent((e) => {
                    const changedLines = e.changes.map(c => c.range.startLineNumber)
                    wsRef.current?.readyState === 1 && wsRef.current.send(JSON.stringify({
                      type: 'collab:lines_changed',
                      lines: changedLines
                    }))
                  })
                }}
                theme="vs-dark"
                path={activeFile.name}
                options={{
                  fontSize: 14,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  tabSize: 2,
                  lineNumbers: 'on',
                  padding: { top: 8 },
                  automaticLayout: true,
                  bracketPairColorization: { enabled: true },
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  renderLineHighlight: 'all',
                  fontFamily: 'Fira Code, Consolas, monospace',
                  fontLigatures: true,
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-600">
                <div className="text-center">
                  <p className="text-4xl mb-3">📄</p>
                  <p className="text-sm">Open a file from the explorer</p>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Panel */}
          {terminalOpen && activeFile && (
            <div className="h-64 border-t border-gray-700 bg-gray-950 shrink-0 flex flex-col">
              <div className="flex items-center justify-between px-4 py-1.5 bg-gray-900 border-b border-gray-700 shrink-0">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Terminal</span>
                <button onClick={() => setTerminalOpen(false)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Terminal
                  code={activeFile.content}
                  language={activeLanguage}
                  onClose={() => setTerminalOpen(false)}
                  inline={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Chat + AI Panel */}
        {chatOpen && (
          <div className="w-72 border-l border-gray-800 bg-gray-900 flex flex-col shrink-0">

            {/* Panel Header with tabs */}
            <div className="px-3 py-2 border-b border-gray-800 shrink-0">
              <div className="flex gap-1 mb-2">
                {['chat', 'ai-edit'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAiEditMode(tab === 'ai-edit')}
                    className={`flex-1 text-xs py-1.5 rounded-lg transition font-medium ${
                      (tab === 'ai-edit') === aiEditMode
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {tab === 'chat' ? '💬 Chat' : '✏️ AI Edit'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {users.length} online{aiThinking ? ' • 🤖 AI thinking...' : ''}
              </p>
            </div>

            {/* Users list */}
            <div className="px-3 py-2 border-b border-gray-800 shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: u.color }}></div>
                    <span className="text-xs text-gray-400">{u.name}{u.id === myUserId ? ' (you)' : ''}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Diff View — shows when AI edit is ready */}
            {aiDiff && (
              <div className="mx-3 mt-3 bg-gray-800 rounded-xl overflow-hidden border border-violet-500/30 shrink-0">
                <div className="px-3 py-2 bg-violet-500/10 border-b border-violet-500/20">
                  <p className="text-xs font-semibold text-violet-400">🔀 AI Suggested Changes</p>
                  <p className="text-xs text-gray-400 mt-0.5">{aiDiff.explanation}</p>
                </div>
                <div className="p-3 max-h-36 overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-1">Preview:</p>
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap bg-gray-950 rounded p-2">
                    {aiDiff.suggested.slice(0, 400)}{aiDiff.suggested.length > 400 ? '\n...' : ''}
                  </pre>
                </div>
                <div className="flex gap-2 p-3 border-t border-gray-700">
                  <button onClick={acceptAiEdit} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded-lg transition font-semibold">
                    ✅ Accept
                  </button>
                  <button onClick={rejectAiEdit} className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs py-2 rounded-lg transition">
                    ❌ Reject
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.userId === myUserId ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1 mb-1">
                    <span className={`text-xs font-medium ${
                      msg.type === 'ai' ? 'text-violet-400' :
                      msg.type === 'system' ? 'text-gray-500' :
                      'text-gray-400'
                    }`}>
                      {msg.userId === myUserId ? 'You' : msg.userName}
                    </span>
                    <span className="text-xs text-gray-700">{msg.time}</span>
                  </div>
                  <div className={`max-w-full px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.type === 'ai' ? 'bg-violet-500/20 border border-violet-500/30 text-violet-100' :
                    msg.type === 'system' ? 'bg-gray-800/50 text-gray-500 italic' :
                    msg.userId === myUserId ? 'bg-violet-600 text-white' :
                    'bg-gray-800 text-gray-300'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Area — switches between Chat and AI Edit mode */}
            <div className="px-3 py-2 border-t border-gray-800 shrink-0">
              {!aiEditMode ? (
                <>
                  <div className="flex gap-1 mb-2 flex-wrap">
                    {['@ai review this', '@ai optimize', '@ai explain'].map(cmd => (
                      <button
                        key={cmd}
                        onClick={() => setChatInput(cmd)}
                        className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-2 py-1 rounded transition"
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Message or @ai ..."
                      className="flex-1 bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim()}
                      className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition text-xs"
                    >
                      →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-2">Tell AI what to do with your code:</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {['Fix all bugs', 'Optimize performance', 'Add error handling', 'Add comments', 'Convert to OOP', 'Make it cleaner'].map(cmd => (
                      <button
                        key={cmd}
                        onClick={() => handleAiEdit(cmd)}
                        disabled={aiEditLoading}
                        className="text-xs bg-gray-800 hover:bg-violet-600 disabled:opacity-50 text-gray-400 hover:text-white px-2 py-1 rounded transition"
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && chatInput.trim() && handleAiEdit(chatInput.trim())}
                      placeholder="e.g. Add binary search..."
                      className="flex-1 bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
                      disabled={aiEditLoading}
                    />
                    <button
                      onClick={() => chatInput.trim() && handleAiEdit(chatInput.trim())}
                      disabled={aiEditLoading || !chatInput.trim()}
                      className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition text-xs"
                    >
                      {aiEditLoading ? '...' : '✏️'}
                    </button>
                  </div>
                  {aiEditLoading && (
                    <p className="text-xs text-violet-400 text-center mt-2 animate-pulse">AI is rewriting your code...</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-violet-700 px-4 py-0.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-xs text-violet-200">🔗 {roomId}</span>
          <span className="text-xs text-violet-200">👥 {users.length} collaborators</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-violet-200">{activeLanguage}</span>
          <span className="text-xs text-violet-200">{activeFile?.name || 'No file open'}</span>
          <span className="text-xs text-violet-200">UTF-8</span>
        </div>
      </div>
    </div>
  )
}