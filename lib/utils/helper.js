/**
 * test if input val is chinese character or not
 * @param {*} value input value
 * @returns true or false
 */
const isChineseChar = (value) => {
  const regex = /[\u4E00-\u9FFF]/;
  return regex.test(value)
}

/**
 * test if input val is string type
 * @param {*} value 
 * @returns 
 */
const isString = (value) => {
  return Object.prototype.toString.call(value) === '[object String]'
}

/**
 * 检查当前路径是否为vue文件
 * @param {*} filePath 
 * @returns boolean
 */
const isVueFile = (filePath) => {
  return filePath.endsWith('.vue')
}

module.exports = {
  isChineseChar,
  isString,
  isVueFile
}