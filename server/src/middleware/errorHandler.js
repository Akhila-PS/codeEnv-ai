function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message)

  if (err.type === 'validation') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details
    })
  }

  if (err.status) {
    return res.status(err.status).json({ error: err.message })
  }

  res.status(500).json({ error: 'Internal server error' })
}

module.exports = errorHandler