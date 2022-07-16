// Mega tuto de electron: https://www.youtube.com/watch?v=0BWzZ6c8z-g
const { app, BrowserWindow } = require('electron')
const ipc = require("electron").ipcMain

// https://github.com/TryGhost/node-sqlite3
const sqlite3 = require('sqlite3').verbose()
var path = require('path')

// Initialize db
const fs = require('fs')
try {
  if (!fs.existsSync( path.join(__dirname, 'localbooru.db') )) {
  const db = new sqlite3.Database(path.join(__dirname, 'localbooru.db'))
    db.serialize(() => {
      db.run(`CREATE TABLE "posts" (
        "id"  INTEGER,
        "post_id" INTEGER UNIQUE,
        "created_at"  TEXT,
        "score" INTEGER,
        "width" INTEGER,
        "height"  INTEGER,
        "md5" TEXT,
        "directory" TEXT,
        "image" TEXT,
        "rating"  TEXT,
        "source"  TEXT,
        "change"  INTEGER,
        "owner" TEXT,
        "creator_id"  INTEGER,
        "parent_id" INTEGER,
        "sample"  INTEGER,
        "preview_height"  INTEGER,
        "preview_width" INTEGER,
        "tags"  TEXT,
        "title" TEXT,
        "has_notes" TEXT,
        "has_comments"  TEXT,
        "file_url"  TEXT,
        "preview_url" TEXT,
        "sample_url"  TEXT,
        "sample_height" INTEGER,
        "sample_width"  INTEGER,
        "status"  TEXT,
        "post_locked" INTEGER,
        "has_children"  TEXT,
        "local_directory" TEXT,
        "custom_tags" TEXT DEFAULT ' ',
        "favorite"  INTEGER,
        PRIMARY KEY("id" AUTOINCREMENT)
      )`)
      db.run(`CREATE TABLE "settings" (
        "id"  INTEGER,
        "remember_last_search"  TEXT,
        "remember_last_source"  TEXT,
        "posts_per_page"  INTEGER,
        "autocomplete_tags_limit" INTEGER,
        "local_root_path" TEXT,
        "default_save_path" TEXT,
        PRIMARY KEY("id" AUTOINCREMENT)
      )`)
      db.run(`CREATE TABLE "tags" (
        "id"  INTEGER,
        "name"  TEXT UNIQUE,
        "type"  INTEGER,
        PRIMARY KEY("id" AUTOINCREMENT)
      )`)
      var stmt = db.prepare(`INSERT INTO settings (id,remember_last_search,remember_last_source,
            posts_per_page,autocomplete_tags_limit,local_root_path,default_save_path) VALUES (?,?,?,?,?,?,?)`)
          stmt.run(1,"","gelbooru","100","100","","/uncategorized")
          stmt.finalize()
    })
    db.close()
  }
} catch(err) {
  console.error(err)
}


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

/*const folder = "C:/Users/Admin/Desktop/flat_chest legs_crossed"
const fs = require('fs')
var gallery = []
fs.readdirSync(folder).forEach(file => {
  gallery.push({src: folder+'/'+file})
})*/

const axios = require('axios').default

ipc.on("settings:require", (e)=>{
  var settings = null
  const db = new sqlite3.Database(path.join(__dirname, 'localbooru.db'))
  db.serialize(() => {
    db.get("SELECT * FROM settings LIMIT 1", (err, row)=>{
      if (row)
        settings = row
    })
  })
  db.close(function () {
    e.sender.send("settings:view", settings)
  })
})

ipc.on("settings:edit", (e, column, value) => {
  const db = new sqlite3.Database(path.join(__dirname, 'localbooru.db'))
  db.serialize(() => {
    db.run(`UPDATE settings SET ${column} = ? WHERE id = 1`, value)
  })
  db.close(function () {
    e.sender.send("settings:updated", true)
  })
})

ipc.on("gallery:require", (e, page, tags, source, settings) => {
  var per_page = settings.posts_per_page
  
  if (/limit\:\d+/.test(tags)) {
    per_page = tags.match(/limit\:(\d+)/)[1]
    tags = tags.trim().split(/\s+/).filter(tag=>!/limit\:\d+/.test(tag)).join(' ')
  }
  
  if (source == 'local')
  {
    e.sender.send("gallery:view", {'@attributes': {count: 0}}, [])
  }
  
  else if (source == 'gelbooru')
  {
    if (/folder\:/.test(tags) || (/^_/.test(tags))) {
      galleryRequireDatabase(e, per_page, page, tags)
    } else {
      galleryRequireGelbooru(e, per_page, page, tags)
    }
  }
})

function galleryRequireGelbooru(e, per_page, page, tags) {
  axios.get('https://gelbooru.com/index.php', {
    params: {
      page: 'dapi',
      s: 'post',
      q: 'index',
      json: 1,
      limit: per_page,
      pid: page ? page - 1 : 0,
      tags: tags ?? '',
    }
  }).then(function (response) {
    var gallery = response.data
    var images = []
    const db = new sqlite3.Database(path.join(__dirname, 'localbooru.db'))
    if (gallery.post) {
      gallery.post.forEach(post => {
        post._source = 'gelbooru'
        post.created_at = Math.floor(new Date(post.created_at).getTime()/1000)
        db.serialize(() => {
          db.get("SELECT * FROM posts WHERE post_id = ? AND favorite=1", post.id, (err, row)=>{
            post.favorite = row ? 1 : 0
            post.custom_tags = row ? row.custom_tags : ''
            post.local_directory = row ? row.local_directory : ''
            if (/\.(webm|mp4)$/.test(post.file_url)) {
              images.push({
                "media": "video",
                //"src-webm": `https://img3.gelbooru.com/images/${post.directory}/${post.image}`,
                "src-mp4": post.file_url,
                "poster": post.preview_url,
                "preload": true,
                "controls": true,
              })
            } else {
              var image = post.sample_url ? post.sample_url : post.file_url
              images.push({src: image})
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
}

function galleryRequireDatabase(e, per_page, page, tags) {
  var _page = page ? page - 1 : 0
  var offset = _page * per_page
  var limit = " " + `LIMIT ${per_page} OFFSET ${offset}`

  const db = new sqlite3.Database(path.join(__dirname, 'localbooru.db'))
  var images = [], gallery = {post:[]}, query = '', sort = null
  db.serialize(() => {
    if (tags.trim()) {
      var andQuery = []
      // tested with "-rating:safe asdf~ as*ss* madoka {hibari ~ tsubame ~ kamome ~ suzume ~ tsugumi} {a ~ b}"
      tags.trim().match(/({[^\s]+(\s+~\s+[^\s]+)+}|[^\s]+)/g).forEach(tag => {
        var inverted = false

        if (/^-/.test(tag)) {
          tag = tag.replace(/^-/, "")
          inverted = true
        }

        if (/^_/.test(tag)) {
          tag = tag.replace(/^_/, "")
        }

        if (/^rating:/.test(tag)) {
          tag = tag.replace(/^rating:/, "")
          if (inverted) {
            andQuery.push(`rating <> '${tag}'`)
          } else andQuery.push(`rating = '${tag}'`)
        }
        else if (/^score:/.test(tag)) {
          tag = tag.replace(/^rating:/, "")
          andQuery.push(`score ${tag}`)
        }
        else if (/^folder:/.test(tag)) {
          route = tag.replace(/^folder:/, "")
          route = decodeURIComponent(route)
          andQuery.push(`local_directory='${route}'`)
        }
        else if (/^!folder:/.test(tag)) {
          route = tag.replace(/^!folder:/, "")
          route = decodeURIComponent(route)
          andQuery.push(`local_directory LIKE '${route}%'`)
        }
        else if (/^sort:/.test(tag)) {
          tag = tag.replace(/^sort:/, "")
          var data = tag.split(/:/)
          switch (data[0]) {
            default:
            case "id":      sort = `ORDER BY post_id`;  break
            case "score":   sort = `ORDER BY score`;    break
            case "rating":  sort = `ORDER BY rating`;   break
            case "user":    sort = `ORDER BY owner`;    break
            case "height":  sort = `ORDER BY height`;   break
            case "width":   sort = `ORDER BY width`;    break
            case "source":  sort = `ORDER BY source`;   break
            case "updated": sort = `ORDER BY change`;   break
            case "random":  sort = `ORDER BY RANDOM()`; break
          }
          if (data.length>1 && data[1] == 'desc')
            sort += ' DESC'
        }
        else if (/{[^\s]+(\s+~\s+[^\s]+)+}/.test(tag)) {
          var orQuery = []
          tag.replace(/[{}~]/g, "").split(/\s+/).forEach(orTag => {
            orQuery.push(`(custom_tags='${tag}' OR tags||' '||custom_tags LIKE '${orTag} %' OR tags||' '||custom_tags LIKE '% ${orTag} %' OR tags||' '||custom_tags LIKE '% ${orTag}')`)
          })
          andQuery.push("("+orQuery.join(" OR ")+")")
        }
        else if (inverted) {
          andQuery.push(`(custom_tags<>'${tag}' AND tags||' '||custom_tags NOT LIKE '${tag} %' AND tags||' '||custom_tags NOT LIKE '% ${tag} %' AND tags||' '||custom_tags NOT LIKE '% ${tag}')`)
        } else {
          andQuery.push(`(custom_tags='${tag}' OR tags||' '||custom_tags LIKE '${tag} %' OR tags||' '||custom_tags LIKE '% ${tag} %' OR tags||' '||custom_tags LIKE '% ${tag}')`)
        }
      })
      order_by = sort ?? "ORDER BY change DESC"
      query = "SELECT *, (SELECT count(0) AS count FROM posts WHERE "+andQuery.join(" AND ")+" AND favorite=1) AS count FROM posts WHERE "+andQuery.join(" AND ")+" AND favorite=1 " + order_by + limit
    } else query = "SELECT *, (SELECT count(0) FROM posts) AS count FROM posts ORDER BY post_id DESC"+limit
    db.each(query, (err, row)=>{
      var post = row
      post._source='gelbooru'
      //post.favorite = 1
      post.id = post.post_id
      delete post.post_id
      post.created_at = Math.floor(new Date(post.created_at).getTime()/1000)
      gallery.post.push(post)
      if (/\.(webm|mp4)$/.test(post.file_url)) {
        images.push({
          "media": "video",
          //"src-webm": `https://img3.gelbooru.com/images/${post.directory}/${post.image}`,
          "src-mp4": post.file_url,
          "poster": post.preview_url,
          "preload": true,
          "controls": true,
        })
      } else {
        var image = post.sample_url ? post.sample_url : post.file_url
        images.push({src: image})
      }
    })
  })
  db.close(function () {
    var count = gallery.post.length>0 ? gallery.post[0].count : 0
    gallery['@attributes'] = {count: count, limit: per_page}
    e.sender.send("gallery:view", gallery, images)
  })
}

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

    db.get("SELECT * FROM settings WHERE id = 1", (err, row)=>{
      var default_save_path = row.default_save_path
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
            post.sample_width, post.status, post.post_locked, post.has_children, default_save_path, "")
          stmt.finalize(function () {stored = true})
        }
      })
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

ipc.on("post:edit", (e, post_id, custom_tags, local_directory, favorite) => {
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
    
    custom_tags = custom_tags.trim().split(/\s+/).map(tag => tag.replace(/^_/, "")).join(' ')
    db.serialize(() => {
      var stmt = db.prepare(`INSERT INTO posts (post_id, created_at, score, width, height, md5, directory,
        image, rating, source, change, owner, creator_id, parent_id, sample, preview_height, preview_width,
        tags, title, has_notes, has_comments, file_url, preview_url, sample_url, sample_height, sample_width,
        status, post_locked, has_children, local_directory, custom_tags, favorite)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(post_id) DO UPDATE SET local_directory=?, custom_tags=?, favorite=?`)
      stmt.run(post_id, post.created_at, post.score, post.width, post.height, post.md5, post.directory,
        post.image, post.rating, post.source, post.change, post.owner, post.creator_id, post.parent_id,
        post.sample, post.preview_height, post.preview_width, post.tags, post.title, post.has_notes,
        post.has_comments, post.file_url, post.preview_url, post.sample_url, post.sample_height,
        post.sample_width, post.status, post.post_locked, post.has_children, local_directory, custom_tags, favorite,
        local_directory, custom_tags, favorite)
      stmt.finalize()
      custom_tags.split(/\s+/).forEach(tag => {
        if (tag) {
          var stmt = db.prepare(`INSERT OR IGNORE INTO tags (name, type) VALUES (?, ?)`)
          stmt.run(tag, 7)
          stmt.finalize()
        }
      })
    })

    var sql = `SELECT id, name, type, (SELECT count(0) FROM posts
                  WHERE (custom_tags=name
                    OR custom_tags LIKE name||' %'
                    OR custom_tags LIKE '% '||name||' %'
                    OR custom_tags LIKE '% '||name) LIMIT 1) AS count
                FROM tags WHERE type=7`
    db.each(sql, (err, row)=>{
      if (row.count==0) {
        var tag = row.name
        var stmt = db.prepare(`DELETE FROM tags WHERE name=?`)
        stmt.run(tag)
        stmt.finalize()
      }
    })
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

ipc.on("tags:organize", (e, tags, custom_tags=null) => {
  axios.get('https://gelbooru.com/index.php', {
    params: {
      page: 'dapi',
      s: 'tag',
      q: 'index',
      json: 1,
      names: tags,
      limit: 1000,
    }
  }).then(function (response) {
    var _tags = response.data.tag
    _tags.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))
    var _custom_tags = []

    var db = new sqlite3.Database(path.join(__dirname, 'localbooru.db'))
    db.serialize(() => {
      if (custom_tags != null) {
        custom_tags.trim().split(/\s+/).forEach(tag => {
          var sql = `SELECT id, name, (
            SELECT COUNT(0) FROM posts WHERE (custom_tags='${tag}' OR custom_tags LIKE '${tag} %'
              OR custom_tags LIKE '% ${tag} %' OR custom_tags LIKE '% ${tag}')
          ) AS count, type, '0' AS ambiguous FROM tags WHERE name='${tag}'`
          db.each(sql, (err, row)=>{
            _custom_tags.push(row)
          })
        })
      } else {
        var sql = `SELECT id, name, (
          SELECT COUNT(0) FROM posts WHERE (custom_tags=name OR custom_tags LIKE name||' %'
            OR custom_tags LIKE '% '||name||' %' OR custom_tags LIKE '% '||name) AND favorite=1
        ) AS count, type, '0' AS ambiguous FROM tags WHERE count<>0`
        db.each(sql, (err, row)=>{
          _custom_tags.push(row)
        })
      }
    })
    db.close(function () {
      e.sender.send("tags:htmlresponse", _tags.concat(_custom_tags))
    })
  })
  .catch(function (error) {
    console.log(error)
  })
})

ipc.on("folders:require", e => {
  var folders = []
  var db = new sqlite3.Database(path.join(__dirname, 'localbooru.db'))
  db.serialize(() => {
    db.each("SELECT DISTINCT(local_directory) as folder FROM posts WHERE favorite=1", (err, row)=>{
      folders.push(row.folder)
    })
  })
  db.close(function () {
    e.sender.send("folders:view", folders)
  })
})

ipc.on("custom-tags:reload", (e, custom_tags) => {
  var db = new sqlite3.Database(path.join(__dirname, 'localbooru.db'))
  db.close(function () {
    e.sender.send("custom-tags:updated")
  })
})

/*
 * Next:
 * - multi-select/edit
 * - add loading animated icons for certain long processes (add to favorite / save or remove favorite / view details)
 * - Icon with settings / Help / About
 */

 /*
  * Useful links:
  * Gelbooru - How to retrieve notes info for posts: https://gelbooru.com/index.php?page=forum&s=view&id=3226
  * Gelbooru - How to API: https://gelbooru.com/index.php?page=wiki&s=view&id=18780
  * -
  * Tags API example: https://gelbooru.com/index.php?page=dapi&s=tag&q=index&json=1&names=kaname_madoka%20legs_crossed
  * Posts API example: https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=kaname_madoka&limit=1001
  * Single post example: https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&id=7430194
  */

  /*
   * https://npm.io/package/@l2studio/iqdb-api
   */