/**
 * @fileoverview find chinese literal and fix them with wrapping i18n function in the vue project
 * @author lucien
 */
"use strict";
const { 
  isString, 
  isChineseChar, 
  isVueFile,
} = require('../utils/helper.js');
const {  
  defineTemplateBodyVisitor, 
  isAlreadyWrapped, 
  isInsideVueTemplate,
  getFullVExpression,
  ensureLangImported, 
  isJSX,
  extractVariablesFromExpressions,
  langKeyGeneration
} = require('../utils/ast-helper.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem', // `problem`, `suggestion`, or `layout`
    docs: {
      description: "This rule helps to find out where chinese literal and fix them with wrapping i18n function in the vue project",
      recommended: true,
      url: null, // URL to the documentation page for this rule
    },
    fixable: 'code', // Or `code` or `whitespace`
    schema: [
      {
        enum: ['always', 'never']
      },
      {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    ], // Add a schema if the rule has options
    messages: {
      notAllowChinese: "Not Allow Using Chinese Literal in {{ type }} -> {{ identifier }}"
    }, // Add messageId and message
  },

  /**
   * 每一个文件都会执行create函数，既context上下文指向当前文件
   * @param {*} context 
   * @returns 
   */
  create(context) {
    // variables should be defined here
    const filename = context.filename || context.getFilename() || '' // 低版本eslint没有filename属性
    
    const scriptVisitor = {
      Literal(node) {
        // 注意: '中文'和this.$lang('中文')类型都是Literal
        // 导致：每次 ESLint 执行 fix 时，如果同样的 Literal 节点被多次处理，那么每次都会在之前已经处理的基础上再添加一层 this.$lang，导致出现嵌套的问题
        if (isAlreadyWrapped(node)) {
           return
        }
        const content = isString(node.value) ? node.value.trim() : node.value
        if (isChineseChar(content)) {
          context.report({ 
            node,
            messageId: "notAllowChinese",
            data: {
              identifier: content,
              type: 'Literal'
            },
            fix(fixer){
              /**
               * 1. 脚本中中文包裹$lang函数（jsx写法需要特殊处理！！！！！！！！！！！！！！）
               */
              const thisPrefix = isVueFile(filename) 
              ? !isInsideVueTemplate(node) 
                ? 'this.$lang' 
                : '$lang' 
              : 'lang'   
              const fixed = `${thisPrefix}('${content}')`
              const fixers = [
                fixer.replaceText(node, fixed),
              ]
              /**
               * 2. 非vue文件的脚本中引入$lang函数，需要导入对应的函数
               */
              const langImport = ensureLangImported(context, fixer)
              langImport && fixers.push(langImport)

              /**
               * 处理jsx写法
               */
              if(isJSX(node.parent)) {
                const beforeBracket = fixer.insertTextBefore(node, '{')
                const afterBracket = fixer.insertTextAfter(node, '}')
                fixers.push(beforeBracket, afterBracket)
              }
              return fixers
            }
          });
        }
      },
      TemplateLiteral(node) {
        const {quasis = [], expressions=[]} = node

        // 1. 处理quasis: 若templateLiteral中含有中文，则提取所有quasis并拼接变量=>生成最终值，作为$lang(key, value)的key值
        const hasChineseStr = quasis.some(({value: {raw}}) => isChineseChar(raw))
        if(!hasChineseStr) return
        const literals = quasis.map(({value: {raw}}) => raw)

        // 2. 处理expressions,提取变量 => 两种情况 1.单变量 xxx${name}xxxx 2.对象属性 xxx${item.name}xxx
        // 将变量名存储到 `variables` 对象中
        const {variables, variablesStr} = extractVariablesFromExpressions(expressions)

        // 3. 生成$lang(key) 
        const {keyName, identifier} = langKeyGeneration(literals, variables)

        context.report({
          node,
          messageId: 'notAllowChinese',
          data: {
            identifier,
            type: 'TemplateLiteral'
          },
          fix(fixer) {
            // ****需要区分是模板中还是script中的
            const thisPrefix = isVueFile(filename) 
              ? !isInsideVueTemplate(node) 
                ? 'this.$lang' 
                : '$lang' 
              : 'lang'   
                
            
            const fixed = `${thisPrefix}('${keyName}', ${variablesStr})`

            return fixer.replaceText(node, fixed)
          }
        })
      },
    }
    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    // any helper functions should go here or else delete this section
    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return defineTemplateBodyVisitor(
      context,
      // template visitors
      {
        VAttribute(node) {
          // 模板属性有两种方式 1.xxx=xxxx 2.:xxx=xxx 指令方式可通过directive属性判断, 指令的格式直接可通过Literal类型处理
         const attrName = node.key.name
         const attrValue = node.value && node.value.value
          if(node.directive) return
          // 排除属性是对象的情况
          if (isString(attrValue) && isChineseChar(attrValue)) {
            context.report({ 
              node: node.value,
              messageId: "notAllowChinese",
              data: {
                identifier: attrValue,
                type: 'VAttribute'
              },
              fix(fixer){
                const fixed = `:${attrName}="$lang('${attrValue}')"`
  
                return fixer.replaceText(node, fixed)
              }
            });
          }
        },
        Property(node) {
          const propName = node.key.name
          const propValue = node.value && node.value.value
          if (isString(propValue) && isChineseChar(propValue)) {
            context.report({ 
              node: node.value,
              messageId: "notAllowChinese",
              data: {
                identifier: propValue,
                type: 'Property'
              },
              fix(fixer){
                const fixed = `${propName}:$lang('${propValue}')`     
    
                return fixer.replaceText(node, fixed)
              }
            });
          }
        },
        // 1. 纯文本 2. xxx{{variable}}xxx文本带变量的形式需要交给VExpressionContainer节点单独处理
        VText(node) {
          // literal是识别中文最后一个层级的类型
          if (isAlreadyWrapped(node)) {
            return
          }
          const hasVExpression = node.parent.children.some(childNode => childNode.type === 'VExpressionContainer')
          if(hasVExpression) return // 文本带变量的形式需要单独处理

          const rawText = node.value.trim() // 格式化（去除换行和空格等）
          if (isString(rawText) && isChineseChar(rawText)) {
            context.report({ 
              node,
              messageId: "notAllowChinese",
              data: {
                identifier: rawText,
                type: 'VText'
              },
              fix(fixer){
                const fixedText = `{{ $lang('${rawText}') }}`;
                return fixer.replaceText(node, fixedText)
              }
            });
          }
        },
        VExpressionContainer(node) {
          const childNodes = node.parent?.children || []
          const hasChineseVText = childNodes.find(childNode => childNode.type === 'VText' && isString(childNode.value) && isChineseChar(childNode.value))
          if(!hasChineseVText) return
          const fullVExpression = getFullVExpression(childNodes)       
          context.report({ 
            node,
            messageId: "notAllowChinese",
            data: {
              identifier: fullVExpression,
              type: 'VExpressionContainer'
            },
            fix(fixer){
              // 1. 处理子节点: 若子节点中含有中文，则提取所有子节点并拼接变量=>生成最终值，作为$lang(key, value)的key值
              const literals = childNodes.filter(childNode => childNode.type === 'VText').map(({value}) => value)

              // 2. 处理expressions,提取变量 => 两种情况 1.单变量 xxx${name}xxxx 2.对象属性 xxx${item.name}xxx
              // 将变量名存储到 `variables` 对象中
              const expression = node.expression
              const {variables, variablesStr} = extractVariablesFromExpressions([expression])

              // 3. 生成$lang(key) 
              const {keyName} = langKeyGeneration(literals, variables)
              
              const startRange = childNodes[0].range[0]
              const endRange = childNodes[childNodes.length - 1].range[1]
              const fixedText = `{{ $lang('${keyName}', ${variablesStr}) }}`;
              return fixer.replaceTextRange([startRange, endRange], fixedText)
            }
          });
          
        },
        Literal(node) {
          scriptVisitor['Literal'](node)
        },
        TemplateLiteral(node) {
          scriptVisitor['TemplateLiteral'](node)
        }
      },
      // script visitors
      scriptVisitor
    )
  },
};