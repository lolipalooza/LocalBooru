// Mega tuto de electron: https://www.youtube.com/watch?v=0BWzZ6c8z-g

const { app, BrowserWindow } = require('electron')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 625
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
})