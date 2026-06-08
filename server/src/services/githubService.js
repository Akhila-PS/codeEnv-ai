const { Octokit } = require('@octokit/rest')

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
})

async function getPRDetails(prUrl) {
  // Parse GitHub PR URL
  // Supports: https://github.com/owner/repo/pull/123
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  if (!match) {
    throw new Error('Invalid GitHub PR URL. Format: https://github.com/owner/repo/pull/123')
  }

  const [, owner, repo, pullNumber] = match

  // Fetch PR info
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: parseInt(pullNumber)
  })

  // Fetch PR files/diff
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: parseInt(pullNumber)
  })

  // Build a readable diff from changed files
  const changedFiles = files.map(f => ({
    filename: f.filename,
    status: f.status, // added, modified, removed
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch || 'Binary file or too large to display'
  }))

  // Detect primary language from file extensions
  const language = detectLanguage(files)

  // Build code string from patches
  const codeFromPR = changedFiles
    .filter(f => f.patch && f.patch !== 'Binary file or too large to display')
    .map(f => `// File: ${f.filename} (${f.status})\n${f.patch}`)
    .join('\n\n---\n\n')
    .slice(0, 8000) // limit size

  return {
    title: pr.title,
    description: pr.body || 'No description provided',
    author: pr.user.login,
    state: pr.state,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: changedFiles.length,
    language,
    code: codeFromPR,
    url: prUrl
  }
}

function detectLanguage(files) {
  const extMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.go': 'go',
    '.rs': 'rust',
    '.php': 'php',
    '.rb': 'ruby',
    '.cs': 'csharp',
    '.kt': 'kotlin',
    '.swift': 'swift',
  }

  const counts = {}
  files.forEach(f => {
    const ext = '.' + f.filename.split('.').pop().toLowerCase()
    const lang = extMap[ext]
    if (lang) counts[lang] = (counts[lang] || 0) + 1
  })

  if (Object.keys(counts).length === 0) return 'javascript'
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

module.exports = { getPRDetails }