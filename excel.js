var fs = require("fs");
var iconv = require('iconv-lite')

fs.readFile('file.csv', function (err, data) {
    if (err) {
        console.log(err);
        return;
    }
    let font = iconv.decode(data, 'gbk')
    ConvertToTable(font, function (content) {
        console.log(content);
    })
});
console.log("程序执行完毕");

function ConvertToTable(data, callBack) {
    var rows = [];
    rows = data.split("\r\n");
    callBack(rows);
}