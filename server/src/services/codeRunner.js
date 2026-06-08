const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

function prepareFiles(code, language) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-'))

  if (language === 'javascript') {
    const file = path.join(tmpDir, 'main.js')
    fs.writeFileSync(file, code)
    return { tmpDir, command: 'node', args: [file], needsCompile: false }
  }

  if (language === 'python') {
    const file = path.join(tmpDir, 'main.py')
    fs.writeFileSync(file, code)
    const cmd = process.platform === 'win32' ? 'python' : 'python3'
    return { tmpDir, command: cmd, args: [file], needsCompile: false }
  }

  if (language === 'java') {
    const classMatch = code.match(/public\s+class\s+(\w+)/)
    const className = classMatch ? classMatch[1] : 'Main'
    const file = path.join(tmpDir, `${className}.java`)
    fs.writeFileSync(file, code)
    return { tmpDir, command: 'java', args: ['-cp', tmpDir, className], needsCompile: true, compileCmd: 'javac', compileArgs: [file], className }
  }

  if (language === 'cpp') {
    const file = path.join(tmpDir, 'main.cpp')
    const outFile = path.join(tmpDir, 'main.exe')
    fs.writeFileSync(file, code)
    return { tmpDir, command: outFile, args: [], needsCompile: true, compileCmd: 'g++', compileArgs: [file, '-o', outFile] }
  }

  return null
}

module.exports = { prepareFiles }