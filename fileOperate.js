const fs = require("fs")
const iconv = require('iconv-lite')
const Json2csvParser = require('json2csv').Parser

class FileOperate {
    constructor(props) {
        this.fields = props.fields || []
        this.result = props.result || []
        this.fileName = props.fileName
        this.saveName = props.saveName
    }

    readExcel() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.fileName, function (err, data) {
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
    }

    saveFile() {
        const json2csvParser = new Json2csvParser({fields})
        const csv = json2csvParser.parse(result)
        const encode = iconv.encode(csv, 'gbk')
    
        fs.writeFile(this.saveName, encode, (err) => {
            if (err) throw err;
            console.log('file saved !')
        })
    }
}