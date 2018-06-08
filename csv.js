const Json2csvParser = require('json2csv').Parser;
var xlsx = require('node-xlsx').default;
var fs = require('fs')

const fields = ['car', 'price', 'color'];
const myCars = [
  {
    "car": "Audi",
    "price": 40000,
    "color": "blue"
  }, {
    "car": "BMW",
    "price": 35000,
    "color": "black"
  }, {
    "car": "Porsche",
    "price": 60000,
    "color": "green"
  }
];

const json2csvParser = new Json2csvParser({ fields });
const csv = json2csvParser.parse(myCars);
console.log('csv', csv)

// const data = [[1, 2, 3], [true, false, null, 'sheetjs'], ['foo', 'bar', new Date('2014-02-19T14:30Z'), '0.3'], ['baz', null, 'qux']];
// const range = {s: {c: 0, r:0 }, e: {c:0, r:3}}; // A1:A4
// const option = {'!merges': [ range ]};
 
// var buffer = xlsx.build([{name: "mySheetName", data: data}], option);
fs.writeFile('file.csv', csv, function(err) {
  if (err) throw err;
  console.log('file saved');
});



