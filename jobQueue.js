const fs = require('fs')

module.exports = class JobQueue {
  constructor(file) {
    this.file = file;
    this.queue = '{}'

    this.prepare()
    this.read()
  }

  prepare() {
    if(!fs.existsSync(this.file)) {
      fs.writeFileSync(this.file, '{}', function(err) {
        if(err) {
          return console.log(err);
        }
      });
    } else {
      try {
        JSON.parse(fs.readFileSync(this.file))
      } catch (e) {
        fs.writeFileSync(this.file, '{}')
      }
    }
  }

  read() {
    this.queue = JSON.parse(fs.readFileSync(this.file))
  }

  write() {
    return fs.writeFileSync(this.file, JSON.stringify(this.queue, null, 4), function(err) {
      if(err) {
        return console.log(err);
      }
    });
  }

  add(pid, folder) {



    this.queue[pid] = { pid: pid, name: `${folder}.mp4`}
    this.write()
  }

  remove(pid) {
    try {
      delete this.queue[pid]
      this.write()
    } catch (e) {
      console.log('Could not delete item from queue ' + pid + ' ...')
    }
  }

  clear() {
    // Validate if process is still and then remove if its gone
  }
}
