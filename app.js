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
    // console.log('start', group)
    Promise.all(
      group.map(async (item) => {
        return new Promise((resolve) => {
          cache.get(`${item.name}-${item.url}`, (err, result) => {
            if (err) {
              console.log('app get err', err)
              reject()
            } else {
              if (result) {
                result = JSON.parse(result)
                // 发送缓存中的数据给前端
                if (result.url) {
                  socket.emit('fetch', result)
                }
                // 过滤缓存数据
                group.some((el, i) => {
                  if ((el.url === result.addr) && (el.name === result.name)) {
                    group.splice(i, 1)
                  }
                })
                resolve('从redis中获取缓存数据！')
              } else {
                // 没有找到数据
                resolve('没有从redis中找到数据！')
              }
            }
          })
        })
      })
    ).then(() => {
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
})

const searchBook = (browser, resp, result, socket) => {
  return async ({
    name,
    url
  }) => {
    const page = await browser.newPage()

    page.on('unhandledRejection', err => {
      console.log('发生错误了',err)
      throw err
    })
    // 超时时间设置长一点，不然报 Navigation Timeout Exceeded
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 20000
    })

    await page.addScriptTag({
      url: 'https://code.jquery.com/jquery-3.2.1.min.js',
      type: 'text/javascript'
    })
   
    await page.evaluate((item) => {
      $(':text').val(item)
      $(':submit').trigger('click')
      $(':button').trigger('click')
    }, name)

    await page.waitFor(3000)
    const pages = await browser.pages()
    Promise.all(
      pages.map(page => {
        return new Promise(async (resolve) => {
          await page.setRequestInterception(true)
          page.on('request', request => {
            if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet') {
              request.abort()
            }
            else {
              request.continue()
            }
          })
          console.log(`正在抓取漫画:${name}`)
          let title = await page.evaluate((param) => {
            return [...document.querySelectorAll('a')].filter(i => i.innerText === param)[0]
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
              cache.expire(`${name}-${url}`)
            })
            socket.emit('fetch', {name, addr: url, url: page.url()})
            resolve('找到了')
            page.close()
          } else {
            let value = JSON.stringify({
              name,
              addr: url,
              url: ''
            })

            cache.set(`${name}-${url}`, value, () => {
              console.log(`${name}存储成功！`)
              cache.expire(`${name}-${url}`)
            })
            resolve('没有找到')
            page.close()
          }
        })
      })
    ).then(() => {
      loading = false
    })
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

