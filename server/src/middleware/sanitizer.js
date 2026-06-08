function sanitizeCode(req, res, next) {
  if (req.body.code) {
    if (req.body.code.length > 10000) {
      return res.status(400).json({ error: 'Code too long. Maximum 10000 characters allowed.' })
    }
    req.body.code = req.body.code.trim()
  }

  if (req.body.email) {
    req.body.email = req.body.email.toLowerCase().trim()
  }

  if (req.body.name) {
    req.body.name = req.body.name.trim().slice(0, 100)
  }

  next()
}

function validateReview(req, res, next) {
  const { code, language } = req.body
  const allowedLanguages = [
    'javascript', 'python', 'java', 'cpp', 'typescript',
    'go', 'rust', 'php', 'kotlin', 'swift', 'ruby', 'csharp', 'sql'
  ]

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required and must be a string.' })
  }

  if (!language || !allowedLanguages.includes(language)) {
    return res.status(400).json({ error: `Invalid language. Allowed: ${allowedLanguages.join(', ')}` })
  }

  next()
}

function validateAuth(req, res, next) {
  const { email, password } = req.body

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required.' })
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }

  next()
}

module.exports = { sanitizeCode, validateReview, validateAuth }