const express = require('express')
const cors = require('cors')
const http = require('http')
const WebSocket = require('ws')
const { spawn, spawnSync } = require('child_process')
const morgan = require('morgan')
const helmet = require('helmet')
const { v4: uuidv4 } = require('uuid')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const reviewRoutes = require('./routes/review')
const { prepareFiles } = require('./services/codeRunner')
const errorHandler = require('./middleware/errorHandler')
const { generalLimiter } = require('./middleware/rateLimiter')
const {
  joinRoom, leaveRoom, updateFile, updateFiles,
  addMessage, broadcastToRoom, broadcastToAll,
  getRoomUsers, updateCursor, updateEditingLines, detectConflicts
} = require('./services/collabService')

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

app.use(helmet())
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://codeenv-ai-client.onrender.com'
  ],
  credentials: true
}))
app.use(morgan('dev'))
app.use(express.json({ limit: '50kb' }))
app.use(generalLimiter)

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1', reviewRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'CodeReviewAI API is running', version: '1.0.0', status: 'healthy' })
})

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

app.use(errorHandler)

wss.on('connection', (ws) => {
  let childProcess = null
  let tmpDir = null
  let currentRoomId = null
  let currentUserId = null
  let currentUserName = null
  let connectionType = null // 'terminal' or 'collab'

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)

      // ─── COLLAB EVENTS ───────────────────────────────
      if (data.type === 'collab:join') {
        connectionType = 'collab'
        currentRoomId = data.roomId
        currentUserId = data.userId || uuidv4()
        currentUserName = data.userName || 'Anonymous'

        const room = joinRoom(currentRoomId, currentUserId, currentUserName, ws)

        ws.send(JSON.stringify({
          type: 'collab:init',
          files: room.files,
          messages: room.messages,
          users: getRoomUsers(currentRoomId),
          userId: currentUserId
        }))
        

        broadcastToRoom(currentRoomId, currentUserId, {
          type: 'collab:user_joined',
          user: { id: currentUserId, name: currentUserName },
          users: getRoomUsers(currentRoomId)
        })
        return
      }

      if (data.type === 'collab:file_change') {
        updateFile(currentRoomId, data.fileId, data.content)
        broadcastToRoom(currentRoomId, currentUserId, {
          type: 'collab:file_change',
          fileId: data.fileId,
          content: data.content,
          userId: currentUserId
        })
        return
      }

      if (data.type === 'collab:files_update') {
        updateFiles(currentRoomId, data.files)
        broadcastToRoom(currentRoomId, currentUserId, {
          type: 'collab:files_update',
          files: data.files
        })
        return
      }

      if (data.type === 'collab:message') {
        const message = addMessage(currentRoomId, currentUserId, currentUserName, data.text)
        broadcastToAll(currentRoomId, {
          type: 'collab:message',
          message
        })
        return
      }

      if (data.type === 'collab:ai_observation') {
        broadcastToRoom(currentRoomId, currentUserId, {
          type: 'collab:ai_observation',
          observation: data.observation
        })
        return
      }

      if (data.type === 'collab:cursor_move') {
  updateCursor(currentRoomId, currentUserId, data.line, data.ch)
  
  // broadcast cursor to others so they see live cursors
  broadcastToRoom(currentRoomId, currentUserId, {
    type: 'collab:cursor_update',
    userId: currentUserId,
    userName: currentUserName,
    line: data.line,
    ch: data.ch
  })

  // check for conflicts after every cursor move
  const conflicts = detectConflicts(currentRoomId)
  if (conflicts.length > 0) {
    broadcastToAll(currentRoomId, {
      type: 'collab:conflict_warning',
      conflicts
    })
  }
  return
}

  if (data.type === 'collab:lines_changed') {
    updateEditingLines(currentRoomId, currentUserId, data.lines)

    const conflicts = detectConflicts(currentRoomId)
    if (conflicts.length > 0) {
      broadcastToAll(currentRoomId, {
        type: 'collab:conflict_warning',
        conflicts
      })
    }
    return
  }

      // ─── TERMINAL EVENTS ─────────────────────────────
      if (data.type === 'run') {
        connectionType = 'terminal'
        const { code, language } = data
        const prepared = prepareFiles(code, language)

        if (!prepared) {
          ws.send(JSON.stringify({ type: 'error', data: `Language "${language}" not supported yet.\r\n` }))
          return
        }

        tmpDir = prepared.tmpDir

        if (prepared.needsCompile) {
          ws.send(JSON.stringify({ type: 'output', data: `Compiling...\r\n` }))
          const compile = spawnSync(prepared.compileCmd, prepared.compileArgs, {
            encoding: 'utf8', timeout: 15000
          })
          if (compile.status !== 0) {
            ws.send(JSON.stringify({ type: 'error', data: 'Compilation Error:\r\n' + (compile.stderr || '') }))
            ws.send(JSON.stringify({ type: 'exit', code: 1 }))
            return
          }
          ws.send(JSON.stringify({ type: 'output', data: `Compiled successfully.\r\n\r\n` }))
        }

        childProcess = spawn(prepared.command, prepared.args, { stdio: ['pipe', 'pipe', 'pipe'] })

        childProcess.stdout.on('data', (d) => ws.send(JSON.stringify({ type: 'output', data: d.toString() })))
        childProcess.stderr.on('data', (d) => ws.send(JSON.stringify({ type: 'error', data: d.toString() })))
        childProcess.on('close', (code) => {
          ws.send(JSON.stringify({ type: 'exit', code }))
          try { require('fs').rmSync(tmpDir, { recursive: true, force: true }) } catch {}
          childProcess = null
        })
        childProcess.on('error', (err) => ws.send(JSON.stringify({ type: 'error', data: err.message + '\r\n' })))
      }

      if (data.type === 'input') {
        if (childProcess && childProcess.stdin.writable) {
          childProcess.stdin.write(data.data)
        }
      }

      if (data.type === 'kill') {
        if (childProcess) { childProcess.kill(); childProcess = null }
      }

    } catch (err) {
      console.error('WS error:', err.message)
    }
  })

  ws.on('close', () => {
    if (connectionType === 'collab' && currentRoomId && currentUserId) {
      leaveRoom(currentRoomId, currentUserId)
      broadcastToRoom(currentRoomId, currentUserId, {
        type: 'collab:user_left',
        userId: currentUserId,
        userName: currentUserName,
        users: getRoomUsers(currentRoomId)
      })
    }
    if (childProcess) { childProcess.kill(); childProcess = null }
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`API available at http://localhost:${PORT}/api/v1`)
})