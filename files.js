const fs = require('fs')
const path = require('path')

module.exports = function files(folder, suffix) {
  let pattern = new RegExp("\."+suffix+"$")

  return fs.readdirSync(folder).filter(item => pattern.test(item)).map(fileName => {
    return {
      path: path.basename(path.dirname(path.join(folder, fileName))),
      filename: fileName
    }
  })
}
