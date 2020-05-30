const express = require('express')
const hbs = require('express-handlebars')
const nodeDiskInfo = require('node-disk-info')
const path = require('path')
const fs = require('fs-extra')
const config = require('config')
const Raspistill = require('node-raspistill').Raspistill
const dateFormat = require('dateformat')
const processImage = require('express-processimage')
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('express-flash-2');
const { spawn } = require('child_process');
const bodyParser = require('body-parser')

const files = require('./files')
const directories = require('./directories')
const app = express()
app.use(express.urlencoded())

const bootTime = new Date()
const dateFolder = dateFormat(bootTime, "dd-mm-yyyy_HH-MM-ss")

const pictureBurstFolder = path.join(__dirname, config.get('paths.pictures'), dateFolder)
const picturesPath = path.join(__dirname, config.get('paths.pictures'))
const videosPath = path.join(__dirname, config.get('paths.videos'))
const jobQueueFile = path.join(__dirname, 'config/jobQueue.json')
const JobQueue = require('./jobQueue');

let queue = new JobQueue(jobQueueFile)

const camera = new Raspistill({
  verticalFlip: config.get('picture.flip'),
  fileName: 'image%04d',
  outputDir: pictureBurstFolder,
  output: picturesPath,
  encoding: 'jpg',
  width: config.get('picture.width'),
  height: config.get('picture.height'),
})

camera.timelapse(config.get('picture.interval') * 1000, config.get('picture.duration') * 1000, () => {
  // Do something
})
  .then(() => {
    console.log('Timelapse ended ...')
  })
  .catch(() => {
    // console.log('Things went south ...')
  })

// Temp fix to remove folder in Root
try {
  fs.rmdirSync(__dirname + '/' + dateFolder)
} catch (e) {
  console.log('Useless folder not deleted', e)
}

app.set('view engine', 'hbs')
app.engine('hbs', hbs({
  extname: 'hbs',
  defaultView: 'default',
  layoutsDir: __dirname + '/views/layouts/',
  partialsDir: __dirname + '/views/partials/',
  helpers: require('./helpers')
}))

app.use(cookieParser('keyboard cat'));
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized:true}));

app.use(flash());

if (!fs.existsSync(pictureBurstFolder)) {
  fs.mkdirSync(pictureBurstFolder, { recursive: true })
}

if (!fs.existsSync(videosPath)) {
  fs.mkdirSync(videosPath, { recursive: true })
}

app.use(processImage())
app.use('/modules', express.static(__dirname + '/node_modules/foundation-sites/dist/'))
app.use('/assets', express.static(__dirname + '/public/'))
app.use('/camera/pictures', express.static(picturesPath))
app.use('/camera/videos', express.static(videosPath))

app.get('/', function (req, res) {

  try {
    const disks = nodeDiskInfo.getDiskInfoSync()
    const pictures = files(pictureBurstFolder, 'jpg')

    let rootDisk = '';
    disks.forEach(function (item) {
      if(item._mounted === "/") {
        item._available = Math.round(item._available / 1024 / 1024).toFixed(2)
        rootDisk = item
      }
    })

    res.render('home', {
      layout: 'default',
      title: 'Dashboard',
      disk: rootDisk,
      latest: pictures[pictures.length - 1],
      pictures: pictures,
      pictureCount: pictures.length,
    })
  } catch (e) {
    console.error(e)
  }
})

app.get('/pictures/:folder', function (req, res) {
  const currentPicturePath = req.params.folder === 'current' ? pictureBurstFolder : path.join(picturesPath, req.params.folder)
  const pictures = files(currentPicturePath, 'jpg')
  const dirs = directories(picturesPath)

  res.render('pictures', { layout: 'default', title: 'Pictures', pictures: pictures, directories: dirs.reverse(), current: req.params.folder })
})

app.get('/video', function (req, res) {
  const dirs = directories(picturesPath)
  const videos = files(videosPath, 'mp4')

  res.render('video', { layout: 'default', title: 'Videos', videos: videos, directories: dirs.reverse() })
})


app.post('/video/delete', function (req, res) {
  console.log(path.join(videosPath, req.body.video))
  const video = req.body.video

  try {
    fs.unlinkSync(path.join(videosPath, video))
    res.flash('success', 'Video ' + video + ' deleted ...')
  } catch (e) {
    res.flash('error', 'Could not delete video ' + e.toString())
  }

  res.redirect('/video')
})

app.post('/pictures/delete', function (req, res) {
  const pictures = req.body.pictures

  try {
    fs.removeSync(path.join(picturesPath, pictures))
    res.flash('success', 'Pictures in' + pictures + ' deleted ...')
  } catch (e) {
    res.flash('error', 'Could not delete pictures ' + e.toString())
  }

  res.redirect('/pictures/current')
})

app.get('/generate-video', function (req, res) {
  const video = req.query.video
  const ffmpeg = spawn('ffmpeg', ['-y', '-r', '10', '-i', path.join(picturesPath, video, 'image%04d.jpg'), '-r', '10', '-vcodec', 'libx264', '-vf', 'scale=1920:1080', path.join(videosPath, video + '.mp4')]);

  queue.add(ffmpeg.pid, video)
  queue.read()

  ffmpeg.on('close', () => {
    queue.remove(ffmpeg.pid)
  });

  res.flash('success', 'Render video ' + video)
  res.redirect('/video')
})


let server = app.listen(3000, function() {
  console.log('BauPi app listening on port 3000 ...')
});

function shutDown() {
  camera.stop()
  server.close()
}

process.on ('SIGTERM', shutDown);
process.on ('SIGINT', shutDown);
process.on ('exit', shutDown);
