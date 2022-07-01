// Mega tuto de electron: https://www.youtube.com/watch?v=0BWzZ6c8z-g

const { app, BrowserWindow } = require('electron')
const ipc = require("electron").ipcMain

const createWindow = () => {
  const win = new BrowserWindow({
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

ipc.on("gallery:require", e => {
  e.sender.send("gallery:view", gallery);
})

