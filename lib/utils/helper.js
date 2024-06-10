const path = require('path')

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

function defineTemplateBodyVisitor(
  context,
  templateBodyVisitor,
  scriptVisitor,
  options
) {
  const sourceCode = context.getSourceCode()
  if (sourceCode.parserServices.defineTemplateBodyVisitor == null) {
    const filename = context.getFilename()
    if (path.extname(filename) === '.vue') {
      context.report({
        loc: { line: 1, column: 0 },
        message:
          'Use the latest vue-eslint-parser. See also https://eslint.vuejs.org/user-guide/#what-is-the-use-the-latest-vue-eslint-parser-error.'
      })
    }
    return {}
  }
  return sourceCode.parserServices.defineTemplateBodyVisitor(
    templateBodyVisitor,
    scriptVisitor,
    options
  )
}

module.exports = {
  isChineseChar,
  isString,
  isVueFile,
  defineTemplateBodyVisitor
}