const express = require('express')
const bodyParser = require('body-parser')
const fs = require("fs")
const iconv = require('iconv-lite')
const Json2csvParser = require('json2csv').Parser
const path = require('path');

const pool = require('./pool')

const app = express()

const fields = ['名称', '网站地址', '漫画地址']
let loading = false

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

app.use(express.static(path.join(__dirname, 'view')));

app.get('/search.json', (req, res) => {
  let {name, url} = req.query
  name = name.split(/;|；/)
  url = url.split(/;|；/)
 
  pool.use(async (browser) => {
    let content = []
    let resp = []
    let result = []

    name.forEach(item => {
      url.forEach(i => {
        content.push({name: item, url: i})
      })
    })
    await timeChunk(content, searchBook(browser, resp, result), 1)
    await saveFile(resp, result)
    res.send({code: 200, list: resp})
  })
})

const searchBook = (browser, resp, result) => {
  return async ({name, url}) => {
      const page = await browser.newPage()
      await page.goto(url, {waitUntil: 'networkidle0'})
      await page.addScriptTag({
          url: 'https://code.jquery.com/jquery-3.2.1.min.js',
          type: 'text/javascript'
      })
    const navigationPromise = page.waitForNavigation({waitUntil: 'load', timeout: 5000})
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
          resp.push({name, addr: url, url: curPage.url()})
          result.push({['名称']: name ,['网站地址']: url, ['漫画地址']: curPage.url()})
        }
        curPage.close()
      } else {
        let title = await page.evaluate((item) => {
          return [...document.querySelectorAll('a')].filter(i => i.innerText === item)[0]
        }, name)
        if (title) {
          resp.push({name, addr: url, url: page.url()})
          result.push({['名称']: name, ['网站地址']: url, ['漫画地址']: page.url()})
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
    const json2csvParser = new Json2csvParser({fields})
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
  
app.listen(9527)
