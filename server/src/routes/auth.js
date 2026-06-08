const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { randomUUID } = require('crypto')
const { readDB, writeDB } = require('../database')
const { authLimiter } = require('../middleware/rateLimiter')
const { validateAuth } = require('../middleware/sanitizer')

const router = express.Router()

router.post('/register', authLimiter, validateAuth, async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' })
    }

    const db = readDB()
    const existingUser = db.users.find(u => u.email === email)
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use.' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const newUser = {
      id: randomUUID(),
      name: name.trim(),
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    }

    db.users.push(newUser)
    writeDB(db)

    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    )

    res.status(201).json({
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/login', authLimiter, validateAuth, async (req, res, next) => {
  try {
    const { email, password } = req.body

    const db = readDB()
    const user = db.users.find(u => u.email === email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router