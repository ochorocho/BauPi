const express = require('express')
const hbs = require('express-handlebars')
const nodeDiskInfo = require('node-disk-info')
const path = require('path')
const fs = require('fs')
const shelljs = require('shelljs')
const config = require('config')
const Raspistill = require('node-raspistill').Raspistill
const dateFormat = require('dateformat')
const processImage = require('express-processimage')
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('express-flash-2');

const files = require('./files')
const directories = require('./directories')

const app = express()
const sessionStore = new session.MemoryStore;

const bootTime = new Date()
const dateFolder = dateFormat(bootTime, "dd-mm-yyyy_HH-MM-ss")

const pictureBurstFolder = path.join(__dirname, config.get('paths.pictures'), dateFolder)
const picturesPath = path.join(__dirname, config.get('paths.pictures'))
const videosPath = path.join(__dirname, config.get('paths.videos'))

const camera = new Raspistill({
  verticalFlip: config.get('picture.flip'),
  fileName: 'image%04d',
  outputDir: pictureBurstFolder,
  encoding: 'jpg',
  width: config.get('picture.width'),
  height: config.get('picture.height'),
})

camera.timelapse(config.get('picture.interval') * 1000, config.get('picture.duration') * 1000, (image) => {
  // Do something
})
  .then(() => {
    console.log('Timelapse ended ...')
  })
  .catch((err) => {
    console.log('Things went south ...', err)
  })

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
// use  the flash middleware
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
    disks.forEach(function (item, index) {
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

  res.render('video', { layout: 'default', title: 'Videos', directories: dirs.reverse() })
})

app.get('/generate-video', function (req, res) {
  res.flash('success', 'Render image ...')
  res.redirect('video')
})

app.listen(3000, function () {
  console.log('BauPi app listening on port 3000 ...')
})

