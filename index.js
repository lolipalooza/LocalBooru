// Mega tuto de electron: https://www.youtube.com/watch?v=0BWzZ6c8z-g

const { app, BrowserWindow } = require('electron')
const ipc = require("electron").ipcMain

var win

const createWindow = () => {
  win = new BrowserWindow({
    width: 1024,
    height: 625,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
})

const folder = "C:/Users/Admin/Desktop/flat_chest legs_crossed"
const fs = require('fs')
var gallery = []
fs.readdirSync(folder).forEach(file => {
  gallery.push({src: folder+'/'+file})
})

ipc.on("deprecated", e => {
  e.sender.send("gallery:view", gallery);
})

const axios = require('axios').default

ipc.on("gallery:require", (e, page, tags) => {
  axios.get('https://gelbooru.com/index.php', {
    params: {
      page: 'dapi',
      s: 'post',
      q: 'index',
      json: 1,
      limit: '100',
      pid: page ? page - 1 : 0,
      tags: tags ?? '',
    }
  }).then(function (response) {
    const gallery = response.data
    e.sender.send("gallery:view", gallery)
  })
  .catch(function (error) {
    console.log(error)
  })
  //.then(function () {
  //  // always executed
  //})
})

ipc.on('minimize', () => {
  win.minimize()
})

ipc.on('maximize', () => {
  if (!win.isMaximized())
    win.maximize()
  else win.unmaximize()
})

ipc.on('close', () => {
  win.close()
})

ipc.on("tags:require", (e, tag) => {
  axios.get('https://gelbooru.com/index.php', {
    params: {
      page: 'dapi',
      s: 'tag',
      q: 'index',
      json: 1,
      limit: '100',
      orderby: 'count',
      name_pattern: `${tag}%`,
    }
  }).then(function (response) {
    const tags = response.data
    e.sender.send("tags:view", tags)
  })
  .catch(function (error) {
    console.log(error)
  })
  //.then(function () {
  //  // always executed
  //})
})