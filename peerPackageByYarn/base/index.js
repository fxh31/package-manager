
const _ = require('lodash')

const arr = ['a', 'b', 'c', 'd'];
const configArray = _.chunk(arr, 2)
console.log(configArray)
