// const path = require('path')

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
 * @param {*} filename 
 * @returns boolean
 */
const isVueFile = (filename) => {
  return filename.endsWith('.vue')
}

/**
 * vue文件访问函数
 * @param {*} context 
 * @param {*} templateBodyVisitor 
 * @param {*} scriptVisitor 
 * @param {*} options 
 * @returns 
 */
function defineTemplateBodyVisitor(
  context,
  templateBodyVisitor,
  scriptVisitor,
  options
) {
  const sourceCode = context.getSourceCode()
  if (sourceCode.parserServices.defineTemplateBodyVisitor == null) {
    const filename = context.getFilename()
    if (isVueFile(filename)) {
      context.report({
        loc: { line: 1, column: 0 },
        message:
          'Use the latest vue-eslint-parser. See also https://eslint.vuejs.org/user-guide/#what-is-the-use-the-latest-vue-eslint-parser-error.'
      })
    }
    return null
  }
  return sourceCode.parserServices.defineTemplateBodyVisitor(
    templateBodyVisitor,
    scriptVisitor,
    options
  )
}

/**
 * 模板字符串是否含有html标签
 */
const isHTMLTag = (value) => {
  const htmlTagPattern = /<[^>]*>/g; // 匹配 HTML 标签
  return htmlTagPattern.test(value)
}

/**
 * 替换HTML标签
 */
const replaceHtmlTag = (value) => {
  const htmlTagPattern = /<[^>]*>/g; // 匹配 HTML 标签
  return value.replace(htmlTagPattern, '') // 将 HTML 标签替换为空字符串
}

/**
 * 中文节点是否已经被$lang或者lang处理
 */
const isAlreadyWrapped = (node) => {
  const parentNode = node.parent
  switch(parentNode.type) {
    case 'CallExpression': 
      return parentNode.callee && ( (parentNode.callee.name && parentNode.callee.name.includes('lang')) || (parentNode.callee.property && parentNode.callee.property.name.includes('lang')))
    case 'JSXElement':
      return /lang/.test(node.value)
    default:
      return parentNode.callee && ( (parentNode.callee.name && parentNode.callee.name.includes('lang')) || (parentNode.callee.property && parentNode.callee.property.name.includes('lang')))
  }
}

/**
 * 确保非vue文件导入对应的lang函数
 */
const ensureLangImported = (context, fixer) => {
  const {ast} = context?.getSourceCode() || context?.sourceCode || {}
  const filename = context.filename || context.getFilename() || '' // 低版本eslint没有filename属性
  if(!isVueFile(filename)) {
    const importDeclarations = ast.body.filter((node) => node.type === 'ImportDeclaration')
    const langImport = importDeclarations.find(item => {
      const specifiers = item.specifiers || []
      const target = specifiers.find(specifier => specifier?.imported?.name === 'lang' || specifier?.local?.name === 'lang')
      return target && item
    })
    if(langImport) {
      return null
    }
    return fixer.insertTextBeforeRange([0, 0], `import { lang } from '@locales/index'\n`)
  }
 
}

// 递归函数，用于检查当前节点是否嵌套在 VElement中（即在vue template模板中）
function isInsideVueTemplate(node) {
  if (!node || !node.parent) return false;
  if (node.parent.type === 'VElement') return true;
  return isInsideVueTemplate(node.parent);
}

// 递归获取 MemberExpression 的完整路径
function getFullMemberExpression(node) {
  if (node.type === 'MemberExpression') {
      const object = getFullMemberExpression(node.object);  // 递归处理 object
      const property = node.property.name;  // 获取属性名
      return `${object}.${property}`;
  } else if (node.type === 'Identifier') {
      // 如果是标识符（如 $store），直接返回它的名称
      return node.name;
  }
  return '';
}

module.exports = {
  isChineseChar,
  isString,
  isVueFile,
  isHTMLTag,
  replaceHtmlTag,
  isAlreadyWrapped,
  isInsideVueTemplate,
  getFullMemberExpression,
  ensureLangImported,
  defineTemplateBodyVisitor
}