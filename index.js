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

var _gallery = [
  { src: 'sample/0b05727de01dd48242a0e6106e386763.jpg' },
  { src: 'sample/0de8a8d0e6a43cf66a3c6fcf6f2bbf6c.png' },
  { src: 'sample/2d3a407b909ec342744a28454d9d47b9.jpg' },
  { src: 'sample/6be3af30217590ca9fb37e52b2a60f16.jpg' },
  { src: 'sample/6eeba0d52324de892bc93ac5264feb2e.png' },
  { src: 'sample/7a77d6d1df2beac356d4e63842cd08c0.jpg' },
  { src: 'sample/7d787ef280f8e69849c1276a115e35c2.jpg' },
  { src: 'sample/7f879fad96d69383d1d83b0e5fc9fed4.png' },
  { src: 'sample/8bc221427b1251a38df87a8e386da890.png' },
  { src: 'sample/8ddc7f143081192d8d2115133da3464a.jpg' },
  { src: 'sample/24d46cdc3b3a27a674a26f13feb7da07.png' },
  { src: 'sample/77ddab9ced6a24f00be80677e2502048.png' },
  { src: 'sample/211ad554e52cc614706f86793f29a63c.png' },
  { src: 'sample/2818f8eb066be00c375959aa4a04c23f.jpg' },
  { src: 'sample/6558ba702450ba32630bf10bbf537983.jpeg' },
  { src: 'sample/432084c097a8605740bd94e20a446e61.gif' },
  { src: 'sample/146431531095.png' },
  { src: 'sample/a2e3d7ba7005810b1a7ed9eb494b63f1.jpeg' },
  { src: 'sample/a72380abb2489640504246e13981f3e4.jpg' },
  { src: 'sample/c6f8675cd30e012bc6b4f21077ee43d9.png' },
  { src: 'sample/bf035687f2b264c77be2ae3302e23216.gif' },
  { src: 'sample/d5fc2bf9c1a7aec43f51f624c89f2564.jpg' },
  { src: 'sample/d580ebedc53ef391afb6b1c54fbb5af0.png' },
  { src: 'sample/f3b573923766f2567095bb4c320a821e.jpg' },
]

ipc.on("gallery:require", e => {
  e.sender.send("gallery:view", gallery);
})

