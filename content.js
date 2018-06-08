const puppeteer = require('puppeteer')
const fs = require("fs")
const iconv = require('iconv-lite')
const Json2csvParser = require('json2csv').Parser

const fields = ['名称', '地址']
let result = []
let loading = true

const readExcel = new Promise((resolve, reject) => {
    fs.readFile('file.csv', function (err, data) {
        if (err) {
            console.log(err)
            reject()
            return
        }
        data = iconv.decode(data, 'gbk')
        let content = data.split("\r\n").map(item => {
            item = item.split(',')
            return {
               name: item[0],
               url: item[1]
            }
        })
        resolve(content)
    });
})

const timeChunk = (arr, fn, count) => {
    return new Promise((resolve, reject) => {
        const start = () => {
            for (let i = 0; i < Math.min(count || 1, arr.length); i++) {
                let item = arr.shift()
                fn(item)
            }
        }
    
        let timer = setInterval(() => {
            if (arr.length === 0 && !loading) {
                console.log('end', loading)
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
    return async ({name, url}) => {
        loading = true
        const page = await browser.newPage()
        await page.goto(url)
        await page.addScriptTag({
            url: 'https://code.jquery.com/jquery-3.2.1.min.js',
            type: 'text/javascript'
        })
        console.log('1')
        const navigationPromise = page.waitForNavigation({waitUntil: 'load', timeout: 5000})
        // console.log('navigationPromise', navigationPromise)
        await page.evaluate((item) => {
            $(':text').val(item)
            $(':submit').trigger('click')
            $(':button').trigger('click')
        }, name)
        console.log('2')
        await navigationPromise.catch(err => console.log('err:', err))
        console.log('3')
        const target = await page.evaluate((item) => {
            const target = [...document.querySelectorAll('a')].filter(i => i.innerText === item)[0]
            return target
        }, name)
        console.log('4')
        loading = false
        if (target) {
            result.push({['名称']: name, ['地址']: page.url()})
        }
    }
}

const saveFile = () => {
    const json2csvParser = new Json2csvParser({fields})
    const csv = json2csvParser.parse(result)
    const encode = iconv.encode(csv, 'gbk')
    fs.writeFile('save.csv', encode, (err) => {
        if (err) throw err;
        console.log('file saved !')
    })
}

puppeteer.launch({headless: false}).then(async browser => {
    const content = await readExcel
    await timeChunk(content, searchBook(browser), 1)
    saveFile()
})

