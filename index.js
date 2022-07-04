// Mega tuto de electron: https://www.youtube.com/watch?v=0BWzZ6c8z-g
const { app, BrowserWindow } = require('electron')
const ipc = require("electron").ipcMain

// https://github.com/TryGhost/node-sqlite3
const sqlite3 = require('sqlite3').verbose()
var path = require('path')

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
    var gallery = response.data
    var images = []
    const db = new sqlite3.Database(path.join(__dirname, 'localbooru.db'))
    if (gallery.post) {
      gallery.post.forEach(post => {
        db.serialize(() => {
          db.get("SELECT * FROM posts WHERE post_id = ?", post.id, (err, row)=>{
            post.favorite = row ? 1 : 0
            if (/\.(webm|mp4)$/.test(post.file_url)) {
              images.push({
                "media": "video",
                "src-webm": `https://img3.gelbooru.com/images/${post.directory}/${post.image}`,
                "src-mp4": post.file_url,
                "poster": post.preview_url,
                "preload": true,
                "controls": true,
                description: post.tags,
              })
            } else {
              var image = post.sample_url ? post.sample_url : post.file_url
              images.push({src: image, description: post.tags})
            }
          })
        })
      })
    }
    db.close(function () {
      e.sender.send("gallery:view", gallery, images)
    })
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

ipc.on("favorites:store", (e, post_id) => {
  axios.get('https://gelbooru.com/index.php', {
    params: {
      page: 'dapi',
      s: 'post',
      q: 'index',
      json: 1,
      id: post_id,
    }
  }).then(function (response) {
    const post = response.data.post[0]
    var db = new sqlite3.Database(path.join(__dirname, 'localbooru.db'))
    var stored = null

    db.get("SELECT * FROM posts WHERE post_id = ?", post_id, (err, row)=>{
      var post_currently_stored = row ? true : false
      if (post_currently_stored)
      {
        // remove the current post from database
        var stmt = db.prepare('DELETE FROM posts WHERE post_id = ?')
        stmt.run(post.id)
        stmt.finalize(function () {stored = false})
      }
      else
      {
        // store the current post into database
        var stmt = db.prepare(`INSERT INTO posts (post_id, created_at, score, width, height, md5, directory,
          image, rating, source, change, owner, creator_id, parent_id, sample, preview_height, preview_width,
          tags, title, has_notes, has_comments, file_url, preview_url, sample_url, sample_height, sample_width,
          status, post_locked, has_children, local_directory, custom_tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        stmt.run(post.id, post.created_at, post.score, post.width, post.height, post.md5, post.directory,
          post.image, post.rating, post.source, post.change, post.owner, post.creator_id, post.parent_id,
          post.sample, post.preview_height, post.preview_width, post.tags, post.title, post.has_notes,
          post.has_comments, post.file_url, post.preview_url, post.sample_url, post.sample_height,
          post.sample_width, post.status, post.post_locked, post.has_children, "/monas chinas", "")
        stmt.finalize(function () {stored = true})
      }
    })
    db.close(function () {
      e.sender.send("favorites:success", stored)
    })
  })
  .catch(function (error) {
    console.log(error)
  })
})

ipc.on("post:require", (e, post_id) => {
  axios.get('https://gelbooru.com/index.php', {
    params: {
      page: 'dapi',
      s: 'post',
      q: 'index',
      json: 1,
      id: post_id,
    }
  }).then(function (response) {
    const gelbooru_post = response.data.post[0]
    var db = new sqlite3.Database(path.join(__dirname, 'localbooru.db'))
    var localbooru_post = null
    db.get("SELECT * FROM posts WHERE post_id = ?", post_id, (err, row)=>{
      localbooru_post = row
    })
    db.close(function () {
      e.sender.send("post:response", gelbooru_post, localbooru_post)
    })
  })
  .catch(function (error) {
    console.log(error)
  })
  //.then(function () {
  //  // always executed
  //})
})

ipc.on("post:edit", (e, post_id, custom_tags, local_directory) => {
  axios.get('https://gelbooru.com/index.php', {
    params: {
      page: 'dapi',
      s: 'post',
      q: 'index',
      json: 1,
      id: post_id,
    }
  }).then(function (response) {
    const post = response.data.post[0]
    var db = new sqlite3.Database(path.join(__dirname, 'localbooru.db'))
    
    //db.get("SELECT * FROM posts WHERE post_id = ?", post_id, (err, row)=>{
      //post = row
      // store the current post into database
      var stmt = db.prepare(`INSERT INTO posts (post_id, created_at, score, width, height, md5, directory,
        image, rating, source, change, owner, creator_id, parent_id, sample, preview_height, preview_width,
        tags, title, has_notes, has_comments, file_url, preview_url, sample_url, sample_height, sample_width,
        status, post_locked, has_children, local_directory, custom_tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(post_id) DO UPDATE SET local_directory=?, custom_tags=?`)
      stmt.run(post_id, post.created_at, post.score, post.width, post.height, post.md5, post.directory,
        post.image, post.rating, post.source, post.change, post.owner, post.creator_id, post.parent_id,
        post.sample, post.preview_height, post.preview_width, post.tags, post.title, post.has_notes,
        post.has_comments, post.file_url, post.preview_url, post.sample_url, post.sample_height,
        post.sample_width, post.status, post.post_locked, post.has_children, local_directory, custom_tags,
        local_directory, custom_tags)
      stmt.finalize()
    //})
    db.close(function () {
      e.sender.send("post:updated")
    })
  })
  .catch(function (error) {
    console.log(error)
  })
  //.then(function () {
  //  // always executed
  //})
})

/*
db.serialize(() => {
    db.each("SELECT rowid AS id, info FROM lorem", (err, row) => {
        console.log(row.id + ": " + row.info)
    })
})
db.close()
*/