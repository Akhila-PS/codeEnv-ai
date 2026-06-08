import { useEffect, useRef, useState } from 'react'

export default function Terminal({ code, language, onClose, inline = false }) {
  const [lines, setLines] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [running, setRunning] = useState(false)
  const [waitingForInput, setWaitingForInput] = useState(false)
  const [exitCode, setExitCode] = useState(null)
  const wsRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  useEffect(() => {
    if (waitingForInput) {
      inputRef.current?.focus()
    }
  }, [waitingForInput])

  const addLine = (text, type = 'output') => {
    setLines(prev => [...prev, { text, type }])
  }

  const runCode = () => {
    setLines([])
    setExitCode(null)
    setRunning(true)
    setWaitingForInput(false)

    const ws = new WebSocket('ws://localhost:5000')
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'run', code, language }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'output') {
        const text = data.data
        addLine(text, 'output')
        // If output ends without newline, likely waiting for input
        if (!text.endsWith('\n') && !text.endsWith('\r\n')) {
          setWaitingForInput(true)
        } else {
          setWaitingForInput(false)
        }
      }

      if (data.type === 'error') {
        addLine(data.data, 'error')
      }

      if (data.type === 'exit') {
        setExitCode(data.code)
        setRunning(false)
        setWaitingForInput(false)
        addLine(
          data.code === 0
            ? '\r\n[Process exited with code 0 ✓]'
            : `\r\n[Process exited with code ${data.code} ✗]`,
          data.code === 0 ? 'success' : 'error'
        )
        ws.close()
      }
    }

    ws.onerror = () => {
      addLine('Connection error. Make sure the server is running.\r\n', 'error')
      setRunning(false)
    }

    ws.onclose = () => {
      setRunning(false)
    }
  }

  const sendInput = () => {
    if (wsRef.current && inputValue !== '') {
      const toSend = inputValue + '\n'
      addLine(inputValue + '\n', 'input')
      wsRef.current.send(JSON.stringify({ type: 'input', data: toSend }))
      setInputValue('')
      setWaitingForInput(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendInput()
  }

  const killProcess = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'kill' }))
      wsRef.current.close()
    }
    setRunning(false)
    addLine('\r\n[Process killed]\r\n', 'error')
  }

  return (
    <div className={inline ? "h-full flex flex-col" : "fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"}>
  <div className={inline ? "h-full flex flex-col" : "w-full max-w-3xl bg-gray-950 border border-gray-700 rounded-2xl overflow-hidden shadow-2xl"}>

        {/* Terminal header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-400 text-sm ml-2 font-mono">
              terminal — {language}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {running && (
              <button
                onClick={killProcess}
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition"
              >
                ■ Stop
              </button>
            )}
            {!running && (
              <button
                onClick={runCode}
                className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition"
              >
                ▶ Run
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Terminal output */}
        <div
          className="h-80 overflow-y-auto p-4 font-mono text-sm cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.length === 0 && !running && (
            <p className="text-gray-600">Press ▶ Run to execute your code...</p>
          )}

          {lines.map((line, i) => (
            <span
              key={i}
              className={
                line.type === 'error' ? 'text-red-400' :
                line.type === 'input' ? 'text-yellow-400' :
                line.type === 'success' ? 'text-green-400' :
                'text-gray-200'
              }
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {line.text}
            </span>
          ))}

          {/* Live input line */}
          {running && waitingForInput && (
            <span className="text-gray-200 font-mono">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-transparent outline-none text-yellow-300 font-mono w-48 caret-yellow-300"
                autoFocus
              />
              <span className="animate-pulse text-yellow-300">▌</span>
            </span>
          )}

          {/* Always-available input when running */}
          {running && !waitingForInput && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-green-400">$</span>
              <input
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="type input and press Enter..."
                className="bg-transparent outline-none text-yellow-300 font-mono flex-1 placeholder-gray-700 text-sm"
              />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Bottom status bar */}
        <div className="px-4 py-2 bg-gray-900 border-t border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono">
            {running ? (
              <span className="text-green-400 flex items-center gap-1">
                <span className="animate-pulse">●</span> Running...
              </span>
            ) : exitCode !== null ? (
              exitCode === 0
                ? <span className="text-green-400">● Completed successfully</span>
                : <span className="text-red-400">● Exited with error</span>
            ) : (
              <span>Ready</span>
            )}
          </span>
          <span className="text-xs text-gray-600">Press Enter to send input</span>
        </div>
      </div>
    </div>
  )
}