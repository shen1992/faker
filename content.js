const puppeteer = require('puppeteer')
const fs = require("fs")
const iconv = require('iconv-lite')
const Json2csvParser = require('json2csv').Parser

const fields = ['名称', '网站地址', '漫画地址']
let result = []
let loading = false

const readExcel = new Promise((resolve, reject) => {
  fs.readFile('file.csv', function (err, data) {
    if (err) {
      console.log(err)
      reject()
      return
    }
    let reduce = []
    data = iconv.decode(data, 'gbk')
    let isUrl = ''
    let cache = []
    let content = data.split("\r\n").reduce((pre, cur, index) => {
      cur = cur.replace(/"/g, '')
      let item = cur.split(',')
      // 一行有多个链接的情况
      if (item.length > 2) {
        let copy = cache = item.slice(1)
        copy.forEach(i => {
          pre.push({
            name: item[0],
            url: i
          })
        })
      } else if (item[1]) {
        // 合并单元格, 并且只有1个链接
        cache = [item[1]]
        pre.push({
          name: item[0],
          url: cache[0]
        })
      } else {
        // 合并单元格，有多个链接
        if (cache.length) {
          cache.forEach(c => {
            pre.push({
              name: item[0],
              url: c
            })
          })
        } else {
          pre.push({
            name: item[0],
            url: item[1]
          })
        }
      }
      return pre
    }, [])
    resolve(content)
  });
})

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

const searchBook = (browser) => {
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
      waitUntil: 'load',
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
        result.push({
          ['名称']: name,
          ['网站地址']: url,
          ['漫画地址']: curPage.url()
        })
      }
      curPage.close()
    } else {
      let title = await page.evaluate((item) => {
        return [...document.querySelectorAll('a')].filter(i => i.innerText === item)[0]
      }, name)
      if (title) {
        result.push({
          ['名称']: name,
          ['网站地址']: url,
          ['漫画地址']: page.url()
        })
      }
    }
    page.close()
    loading = false
  }
}

const saveFile = () => {
  const json2csvParser = new Json2csvParser({
    fields
  })
  const csv = json2csvParser.parse(result)
  const encode = iconv.encode(csv, 'gbk')
  fs.writeFile('save.csv', encode, (err) => {
    if (err) throw err;
    console.log('file saved !')
  })
}

puppeteer.launch().then(async browser => {
  const content = await readExcel
  await timeChunk(content, searchBook(browser), 1)
  saveFile()
})