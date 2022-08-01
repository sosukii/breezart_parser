const fs = require('fs')

const content = JSON.parse(fs.readFileSync('./listOfNameAndSKU.json'))

module.exports = {
    content
}