const express = require('express')
const bodyParser = require('body-parser')
const fs = require("fs")
const iconv = require('iconv-lite')
const Json2csvParser = require('json2csv').Parser
const path = require('path');

const pool = require('./pool')
const cache = require('./common/cache')

const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
server.listen(9527)

const fields = ['名称', '网站地址', '漫画地址']
let loading = false

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))

app.use(express.static(path.join(__dirname, 'view')));

io.on('connection', (socket) => {
  console.log('connection')
  socket.on('crawler', async ({name, url}) => {
    names = name.split(/;|；/)
    urls = url.split(/;|；/)
    let group = []

    names.forEach((name) => {
      urls.forEach(url => {
        group.push({
          name,
          url
        })
      })
    })
    await new Promise((resolve, reject) => {
      group.forEach((item, i) => {
        cache.get(`${item.name}-${item.url}`, (err, result) => {
          if (err) {
            console.log('app get err', err)
            reject()
          } else {
            if (result) {
              result = JSON.parse(result)
              socket.emit('fetch', [result])
              group.pop()
              resolve()
            }
          }
        })
      })
    })
    // 过滤缓存数据
    if (group.length) {
      pool.use(async (browser) => {
        let resp = []
        let result = []
  
        await timeChunk(group, searchBook(browser, resp, result, socket), 1)
        await saveFile(resp, result)
        socket.emit('end')
      })
    } else {
      socket.emit('end')
    }
  })
})

const searchBook = (browser, resp, result, socket) => {
  return async ({
    name,
    url
  }) => {
    const page = await browser.newPage()
    await page.goto(url, {
      waitUntil: 'networkidle0'
    })
    await page.addScriptTag({
      url: 'https://code.jquery.com/jquery-3.2.1.min.js',
      type: 'text/javascript'
    })
    const navigationPromise = page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 5000
    })
    await page.evaluate((item) => {
      $(':text').val(item)
      $(':submit').trigger('click')
      $(':button').trigger('click')
    }, name)

    // 会导致新开的页面不加入browser.pages()的问题
    await navigationPromise.catch(err => console.log('err:', err))
    const pages = await browser.pages()
    // 有些网站搜索的时候会打开另外一个页面
    if (pages.length >= 3) {
      const curPage = pages.pop()
      let title = await curPage.evaluate((item) => {
        return [...document.querySelectorAll('a')].filter(i => i.innerText === item)[0]
      }, name)
      if (title) {
        resp.push({
          name,
          addr: url,
          url: curPage.url()
        })
        // excel
        result.push({
          ['名称']: name,
          ['网站地址']: url,
          ['漫画地址']: curPage.url()
        })
        let value = JSON.stringify({
          name,
          addr: url,
          url: curPage.url()
        })
        cache.set(`${name}-${url}`, value, () => {
          console.log(`${name}存储成功！`)
          cache.expire(`${name}-${url}`)
        })
        socket.emit('fetch', resp)
      }
      curPage.close()
    } else {
      let title = await page.evaluate((item) => {
        return [...document.querySelectorAll('a')].filter(i => i.innerText === item)[0]
      }, name)
      if (title) {
        resp.push({
          name,
          addr: url,
          url: page.url()
        })
        // excel
        result.push({
          ['名称']: name,
          ['网站地址']: url,
          ['漫画地址']: page.url()
        })
        let value = JSON.stringify({
          name,
          addr: url,
          url: page.url()
        })
        cache.set(`${name}-${url}`, value, () => {
          console.log(`${name}存储成功！`)
        })
        socket.emit('fetch', resp)
      }
    }
    page.close()
    loading = false
  }
}

const timeChunk = (arr, fn, count) => {
  return new Promise((resolve, reject) => {
    const start = () => {
      for (let i = 0; i < Math.min(count || 1, arr.length); i++) {
        if (!loading) {
          loading = true
          let item = arr.shift()
          fn(item)
        }
      }
    }

    let timer = setInterval(() => {
      if (arr.length === 0 && !loading) {
        console.log('结束了！')
        resolve()
        clearInterval(timer)
        return
      }
      start()
    }, 5000)
  })
}

const saveFile = (resp, result) => (
  new Promise((reslove, reject) => {
    const json2csvParser = new Json2csvParser({
      fields
    })
    const csv = json2csvParser.parse(result)
    const encode = iconv.encode(csv, 'gbk')

    fs.writeFile('./view/save.csv', encode, (err) => {
      if (err) {
        reject(err)
      } else {
        console.log('file saved !')
        reslove(resp)
      }
    })
  })
)

