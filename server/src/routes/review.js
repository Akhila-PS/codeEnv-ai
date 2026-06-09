const express = require('express')
const { reviewCode } = require('../services/aiReview')
const { runCode } = require('../services/codeRunner')
const { readDB, writeDB } = require('../database')
const { randomUUID } = require('crypto')
const jwt = require('jsonwebtoken')
const { reviewLimiter } = require('../middleware/rateLimiter')
const { sanitizeCode, validateReview } = require('../middleware/sanitizer')
const { getPRDetails } = require('../services/githubService')
const router = express.Router()

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided.' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

router.post('/review',
  authMiddleware,
  reviewLimiter,
  sanitizeCode,
  validateReview,
  async (req, res, next) => {
    try {
      const { code, language } = req.body
      const result = await reviewCode(code, language)

      const db = readDB()
      const review = {
        id: randomUUID(),
        code,
        language,
        result: JSON.stringify(result),
        score: result.overallScore,
        userId: req.userId,
        createdAt: new Date().toISOString()
      }
      db.reviews.push(review)
      writeDB(db)

      res.json(result)
    } catch (error) {
      next(error)
    }
  }
)

router.get('/history', authMiddleware, (req, res, next) => {
  try {
    const db = readDB()
    const userReviews = db.reviews
      .filter(r => r.userId === req.userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map(r => ({
        id: r.id,
        language: r.language,
        score: r.score,
        createdAt: r.createdAt,
        summary: JSON.parse(r.result).summary
      }))
    res.json(userReviews)
  } catch (error) {
    next(error)
  }
})

router.delete('/review/:id', authMiddleware, (req, res, next) => {
  try {
    const db = readDB()
    const index = db.reviews.findIndex(
      r => r.id === req.params.id && r.userId === req.userId
    )
    if (index === -1) {
      return res.status(404).json({ error: 'Review not found.' })
    }
    db.reviews.splice(index, 1)
    writeDB(db)
    res.json({ message: 'Review deleted successfully.' })
  } catch (error) {
    next(error)
  }
})

router.post('/github/pr', authMiddleware, async (req, res, next) => {
  try {
    const { prUrl } = req.body

    if (!prUrl || typeof prUrl !== 'string') {
      return res.status(400).json({ error: 'GitHub PR URL is required.' })
    }

    if (!prUrl.includes('github.com') || !prUrl.includes('/pull/')) {
      return res.status(400).json({ error: 'Invalid GitHub PR URL format.' })
    }

    const prDetails = await getPRDetails(prUrl)

    if (!prDetails.code || prDetails.code.trim().length < 10) {
      return res.status(400).json({ error: 'No reviewable code found in this PR.' })
    }

    // Run AI review on the PR diff
    const result = await reviewCode(prDetails.code, prDetails.language)

    // Save to history
    const db = readDB()
    const review = {
      id: randomUUID(),
      code: prDetails.code,
      language: prDetails.language,
      result: JSON.stringify(result),
      score: result.overallScore,
      userId: req.userId,
      prUrl,
      prTitle: prDetails.title,
      createdAt: new Date().toISOString()
    }
    db.reviews.push(review)
    writeDB(db)

    res.json({
      ...result,
      prDetails: {
        title: prDetails.title,
        author: prDetails.author,
        description: prDetails.description,
        additions: prDetails.additions,
        deletions: prDetails.deletions,
        changedFiles: prDetails.changedFiles,
        language: prDetails.language,
        url: prDetails.url
      }
    })
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: 'PR not found. Make sure the URL is correct and the repo is public.' })
    }
    if (error.status === 401) {
      return res.status(401).json({ error: 'GitHub token invalid or expired.' })
    }
    next(error)
  }
})

router.post('/collab/ai-observe', authMiddleware, async (req, res, next) => {
  try {
    const { code, language, trigger, question } = req.body

    if (!code || code.trim().length < 20) {
      return res.json({ observation: null })
    }

    const Groq = require('groq-sdk')
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    let prompt = ''

    if (trigger === 'session_end') {
      prompt = `You just observed a collaborative coding session. Here is the final code:

\`\`\`${language}
${code}
\`\`\`

Give a brief session summary in 3-4 sentences covering: what was built, main strengths, one key improvement, and an encouraging closing message. Be warm and concise.`
    } else if (trigger === 'manual' && question) {
      prompt = `A developer asked: "${question}"

Here is their current ${language} code:
\`\`\`${language}
${code}
\`\`\`

Answer their question directly and concisely in 2-3 sentences. Be helpful and specific to their code.`
    } else {
      prompt = `You are an AI Mentor observing a live coding session. Here is the current ${language} code:

\`\`\`${language}
${code}
\`\`\`

Proactively share ONE most important observation. Focus on: bugs, performance issues, or a quick improvement tip. Keep it to 2 sentences maximum. Be direct and friendly. Start with an emoji.`
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a friendly AI pair programming mentor. Be concise, warm, and helpful. Never write more than 3-4 sentences unless asked.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 200,
    })

    const observation = completion.choices[0].message.content.trim()
    res.json({ observation })
  } catch (error) {
    next(error)
  }
})

router.post('/collab/ai-edit', authMiddleware, async (req, res, next) => {
  try {
    const { code, language, instruction } = req.body

    if (!code || !instruction) {
      return res.status(400).json({ error: 'Code and instruction are required.' })
    }

    const Groq = require('groq-sdk')
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert ${language} programmer. When given code and an instruction, rewrite the code following the instruction exactly. Return ONLY valid JSON with two fields: "newCode" (the complete rewritten code as a string, with all indentation and newlines preserved using \\n and \\t escape sequences) and "explanation" (one sentence explaining what you changed). No markdown, no backticks outside JSON. Preserve all original indentation style (tabs or spaces) exactly.`
        },
        {
          role: 'user',
          content: `Instruction: ${instruction}

Code to modify (${language}):
${code}

Return JSON: {"newCode": "...", "explanation": "..."}`
        }
      ],
      temperature: 0.1,
      max_tokens: 3000,
    })

    const text = completion.choices[0].message.content.trim()
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

// Preserve indentation: normalize line endings
    const formattedCode = parsed.newCode
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '')

    res.json({
      newCode: formattedCode,
      explanation: parsed.explanation
    })
  } catch (error) {
    next(error)
  }
})

router.post('/interview/start', authMiddleware, async (req, res, next) => {
  try {
    const { code, language, difficulty } = req.body
    if (!code) return res.status(400).json({ error: 'Code is required' })

    const Groq = require('groq-sdk')
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const difficultyPrompts = {
      junior: 'Ask basic questions about correctness, variable naming, and simple improvements.',
      mid: 'Ask about time complexity, design patterns, edge cases, and refactoring.',
      senior: 'Ask about scalability, architecture decisions, tradeoffs, security, and production concerns.'
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a senior software engineer conducting a technical interview. Generate exactly 5 interview questions about the provided code. ${difficultyPrompts[difficulty || 'mid']} Return ONLY a JSON array of 5 question strings. No other text.`
        },
        {
          role: 'user',
          content: `Generate 5 ${difficulty} level interview questions for this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nReturn ONLY: ["question1", "question2", "question3", "question4", "question5"]`
        }
      ],
      temperature: 0.4,
      max_tokens: 1000,
    })

    const text = completion.choices[0].message.content.trim()
    const cleaned = text.replace(/```json|```/g, '').trim()
    const questions = JSON.parse(cleaned)

    res.json({ questions })
  } catch (error) {
    next(error)
  }
})

router.post('/interview/evaluate-answer', authMiddleware, async (req, res, next) => {
  try {
    const { code, language, difficulty, question, answer, questionIndex } = req.body

    const Groq = require('groq-sdk')
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a senior engineer evaluating a candidate\'s interview answer. Be fair but honest. Return ONLY valid JSON.'
        },
        {
          role: 'user',
          content: `Code (${language}):
\`\`\`${language}
${code}
\`\`\`

Question: ${question}
Candidate's Answer: ${answer || '(No answer given)'}
Difficulty: ${difficulty}

Evaluate and return ONLY this JSON:
{
  "score": <0-100>,
  "feedback": "<2-3 sentences of specific feedback on their answer>",
  "idealAnswer": "<what a strong answer would include in 2 sentences>"
}`
        }
      ],
      temperature: 0.2,
      max_tokens: 500,
    })

    const text = completion.choices[0].message.content.trim()
    const cleaned = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.post('/interview/finish', authMiddleware, async (req, res, next) => {
  try {
    const { code, language, difficulty, questions, answers } = req.body

    const Groq = require('groq-sdk')
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const qaText = questions.map((q, i) =>
      `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i]?.answer || '(No answer)'}`
    ).join('\n\n')

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a senior engineer giving final interview feedback. Be honest and constructive. Return ONLY valid JSON.'
        },
        {
          role: 'user',
          content: `Evaluate this complete ${difficulty} level technical interview for ${language} code.

Code:
\`\`\`${language}
${code}
\`\`\`

Interview Q&A:
${qaText}

Return ONLY this JSON:
{
  "overallScore": <0-100>,
  "technicalScore": <0-100>,
  "communicationScore": <0-100>,
  "problemSolvingScore": <0-100>,
  "verdict": "<one line verdict like 'Ready for mid-level roles' or 'Needs more preparation'>",
  "summary": "<3-4 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "studyTopics": ["<topic to study 1>", "<topic to study 2>", "<topic to study 3>"],
  "questionReviews": [
    {
      "question": "<question text>",
      "answer": "<their answer>",
      "score": <0-100>,
      "comment": "<one line comment>"
    }
  ]
}`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    })

    const text = completion.choices[0].message.content.trim()
    const cleaned = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.delete('/history/all', authMiddleware, (req, res, next) => {
  try {
    const db = readDB()
    db.reviews = db.reviews.filter(r => r.userId !== req.userId)
    writeDB(db)
    res.json({ message: 'All reviews deleted successfully.' })
  } catch (error) {
    next(error)
  }
})

router.post('/learning/generate', authMiddleware, async (req, res, next) => {
  try {
    const { history } = req.body
    if (!history || history.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 reviews' })
    }

    const Groq = require('groq-sdk')
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const historyText = history.slice(0, 10).map((h, i) =>
      `Review ${i + 1}: Language=${h.language}, Score=${h.score}/100, Summary="${h.summary}"`
    ).join('\n')

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert programming mentor. Create personalized 7-day learning plans based on code review history. Return ONLY valid JSON.'
        },
        {
          role: 'user',
          content: `Based on this developer's code review history, create a personalized 7-day learning path:

${historyText}

Return ONLY this JSON:
{
  "title": "<personalized title like 'Java Performance Mastery Plan'>",
  "summary": "<2 sentence summary of what this plan addresses>",
  "weakAreas": ["<weak area 1>", "<weak area 2>", "<weak area 3>"],
  "days": [
    {
      "day": 1,
      "title": "<day title>",
      "focus": "<one line focus>",
      "estimatedTime": "<e.g. 2 hours>",
      "topics": [
        {
          "id": "d1t1",
          "title": "<topic title>",
          "description": "<one sentence description>",
          "type": "<concept|practice|project>",
          "resource": "<specific book chapter, website, or exercise to use>"
        }
      ]
    }
  ]
}

Make exactly 7 days with 2-3 topics each. Base it specifically on their weak areas from the review history.`
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    })

    const text = completion.choices[0].message.content.trim()
    const cleaned = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)
    res.json(result)
  } catch (error) {
    next(error)
  }
})
module.exports = router