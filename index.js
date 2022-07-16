const { browserInstance } = require('./browser')
const { parse } = require('./controller')

const { breezartObject } = require('./breezart.js')

parse(browserInstance, breezartObject)