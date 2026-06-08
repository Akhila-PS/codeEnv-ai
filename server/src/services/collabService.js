const rooms = new Map()

function createRoom(roomId) {
  const room = {
    id: roomId,
    files: [
      { id: '1', name: 'Main.java', content: '// Start coding together!\npublic class Main {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println("Hello, World!");\n\t}\n}', folder: null },
      { id: '2', name: 'Solution.py', content: '# Python solution\ndef main():\n    print("Hello, World!")\n\nmain()', folder: null },
    ],
    messages: [],
    users: new Map(),
    createdAt: new Date().toISOString()
  }
  rooms.set(roomId, room)
  return room
}

function getRoom(roomId) {
  return rooms.get(roomId)
}

function joinRoom(roomId, userId, userName, ws) {
  let room = rooms.get(roomId)
  if (!room) room = createRoom(roomId)
  room.users.set(userId, {
    id: userId,
    name: userName,
    ws,
    color: getColor(room.users.size),
    cursor: { line: 0, ch: 0 },
    editingLines: new Set() // tracks which lines they're actively editing
  })
  return room
}

function leaveRoom(roomId, userId) {
  const room = rooms.get(roomId)
  if (!room) return
  room.users.delete(userId)
  if (room.users.size === 0) rooms.delete(roomId)
}

function updateFile(roomId, fileId, content) {
  const room = rooms.get(roomId)
  if (!room) return
  room.files = room.files.map(f => f.id === fileId ? { ...f, content } : f)
}

function updateFiles(roomId, files) {
  const room = rooms.get(roomId)
  if (!room) return
  room.files = files
}

function addMessage(roomId, userId, userName, text) {
  const room = rooms.get(roomId)
  if (!room) return
  const message = {
    id: Date.now().toString(),
    userId,
    userName,
    text,
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    type: 'user'
  }
  room.messages.push(message)
  if (room.messages.length > 100) room.messages.shift()
  return message
}

function broadcastToRoom(roomId, senderId, data) {
  const room = rooms.get(roomId)
  if (!room) return
  room.users.forEach((user, userId) => {
    if (userId !== senderId && user.ws.readyState === 1) {
      user.ws.send(JSON.stringify(data))
    }
  })
}

function broadcastToAll(roomId, data) {
  const room = rooms.get(roomId)
  if (!room) return
  room.users.forEach(user => {
    if (user.ws.readyState === 1) {
      user.ws.send(JSON.stringify(data))
    }
  })
}

function getRoomUsers(roomId) {
  const room = rooms.get(roomId)
  if (!room) return []
  return Array.from(room.users.values()).map(u => ({
    id: u.id,
    name: u.name,
    color: u.color
  }))
}

function getColor(index) {
  const colors = ['#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777']
  return colors[index % colors.length]
}

function updateCursor(roomId, userId, line, ch) {
  const room = rooms.get(roomId)
  if (!room) return
  const user = room.users.get(userId)
  if (!user) return
  user.cursor = { line, ch }
}

function updateEditingLines(roomId, userId, changedLines) {
  const room = rooms.get(roomId)
  if (!room) return
  const user = room.users.get(userId)
  if (!user) return
  // keep last 20 lines they touched
  changedLines.forEach(l => user.editingLines.add(l))
  if (user.editingLines.size > 20) {
    const arr = Array.from(user.editingLines)
    user.editingLines = new Set(arr.slice(-20))
  }
}

function detectConflicts(roomId) {
  const room = rooms.get(roomId)
  if (!room) return []

  const users = Array.from(room.users.values())
  const conflicts = []

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const a = users[i]
      const b = users[j]

      // find overlapping lines between both users' editing zones
      const overlap = [...a.editingLines]
        .filter(line => {
          return b.editingLines.has(line) ||
            Math.abs(line - b.cursor.line) <= 3 // within 3 lines of cursor
        })

      if (overlap.length > 0) {
        conflicts.push({
          userA: { id: a.id, name: a.name, color: a.color },
          userB: { id: b.id, name: b.name, color: b.color },
          lines: overlap
        })
      }
    }
  }
  return conflicts
}

module.exports = {
  createRoom, getRoom, joinRoom, leaveRoom,
  updateFile, updateFiles, addMessage,
  broadcastToRoom, broadcastToAll, getRoomUsers,
  updateCursor, updateEditingLines, detectConflicts // add these
}

module.exports = {
  createRoom, getRoom, joinRoom, leaveRoom,
  updateFile, updateFiles, addMessage,
  broadcastToRoom, broadcastToAll, getRoomUsers
}