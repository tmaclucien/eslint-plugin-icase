
const {isVueFile, isString, isHTMLTag, replaceHtmlTag} = require('./helper')

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
 * 中文节点是否已经被$lang或者lang处理
 * @param {*} node 
 * @returns boolean
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
 * @param {*} context 当前文件上下文 fixer
 * @param {*} fixer fixer函数
 * @returns fixer
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
    return fixer.insertTextBeforeRange([0, 0], `import { lang } from '@/locales/index'\n`)
  }
 
}

/**
 * 递归函数，用于检查当前节点是否嵌套在 VElement中（即在vue template模板中）
 * @param {*} node 
 * @returns boolean
 */
function isInsideVueTemplate(node) {
  if (!node || !node.parent) return false;
  if (node.parent.type === 'VElement') return true;
  return isInsideVueTemplate(node.parent);
}

/**
 * 递归获取 MemberExpression 的完整路径
 * @param {*} node 
 * @returns string 变量名全路径
 */
function getFullMemberExpression(node) {
  switch(node.type) {
    case 'OptionalMemberExpression':
    case 'MemberExpression': {
      const object = getFullMemberExpression(node.object);  // 递归处理 object
      const property = node.property.name;  // 获取属性名
      const optional = node.optional // 是否是可选参数
      return `${object}${optional ? '?' : ''}.${property}`;
    }
    case 'ThisExpression': {
      return 'this';
    }
    case 'Identifier': {
      // 如果是标识符（如 $store），直接返回它的名称
      return node.name;
    }
    default: 
    return ''   
  }
}

/**
 * 获取带有中文的VExpression完整路径，如<p>这是{{variable}}名称</p>
 * @param {*} nodes 
 * @returns expressions
 */
function getFullVExpression(nodes) {
  let expression = ''
  nodes.forEach(node => {
    if(node.type === 'VText') {
      expression += node.value
    }else if(node.type === 'VExpressionContainer') {
      const fullExpression = getFullMemberExpression(node.expression)
      expression += `{{ ${fullExpression} }}`
    }
  })
  return expression
}

/**
 * 是否是jsx元素
 * @param {*} node 
 * @returns boolean
 */
function isJSX(node) {
  return node.type === 'JSXElement'
}

/**
 * 从expression节点中提取变量全路径
 * @param {*} expressions expression nodes
 * @returns variables {propertyName1: value, propertyName2: value}
 */
function extractVariablesFromExpressions(expressions) {
  // 1. 提取变量至variables对象中
  let fullExpression = ''
  let variables = {}
  expressions.forEach(expression => {
    // 获取完整的属性值value对应的的取值路径
    fullExpression = getFullMemberExpression(expression);
    if(expression?.name) {
      variables[expression.name] = expression.name
    }else if(expression?.property?.name) {
      const propertyName = expression.property.name
      // variables[propertyName] = `${expressions[index].object.name}.${propertyName}`
      variables[propertyName] = `${fullExpression}`
    }
  });
  // 2. 将变量对象格式化为对象字面量
  const variablesStr = `{${Object.entries(variables)
    .map(([key, value]) => {
      if(key === value) {
        return key
      }
      return `${key}: ${value}`
    })
    .join(', ')}}`

  return {
    variables,
    variablesStr
  }
}

/**
 * 生成$lang函数key值
 * @param {*} literals 
 * @param {*} variables 
 * @returns 
 */
function langKeyGeneration(literals=[], variables) {
  let  keyName = ''
  let identifier = ''
  literals.forEach((literal, index) => {
    if(!isString(literal)) return
    if(isHTMLTag(literal)) {
      const trimed = literal.trim()
      literal = replaceHtmlTag(trimed)
    }
    keyName+=literal
    identifier+=literal
    // 拼接变量
    const variableKey = Object.keys(variables)[index]
    if(variableKey) {
      keyName+=`{${variableKey}}`
      identifier+=`\${${variables[variableKey]}}`
    }
  })
  return {keyName, identifier}
}


module.exports = {
  isAlreadyWrapped,
  isInsideVueTemplate,
  getFullMemberExpression,
  ensureLangImported,
  defineTemplateBodyVisitor,
  isJSX,
  getFullVExpression,
  extractVariablesFromExpressions,
  langKeyGeneration
}