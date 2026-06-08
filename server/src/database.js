const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '../db.json')

const defaultData = { users: [], reviews: [] }

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2))
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

module.exports = { readDB, writeDB }