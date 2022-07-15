const { browserInstance } = require('./browser')
const { scrape } = require('./controller')

const { breezartObject } = require('./breezart.js')

scrape(browserInstance, breezartObject)