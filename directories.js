const fs = require('fs')

module.exports = function directories(folder) {
  return fs.readdirSync(folder, { withFileTypes: true })
    .filter(dir => dir.isDirectory())
    .map(dir => dir.name)
}
