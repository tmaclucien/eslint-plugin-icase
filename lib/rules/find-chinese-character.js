/**
 * @fileoverview find chinese character in the vue project
 * @author lucien
 */
"use strict";
const { 
  isString, 
  isChineseChar, 
  isHTMLTag, 
  replaceHtmlTag, 
  defineTemplateBodyVisitor, 
  isAlreadyWrapped, 
  isInsideVueTemplate,
  getFullMemberExpression,
  ensureLangImported, 
  isVueFile
} = require('../utils/helper.js');
const { generate, diff } = require('../utils/generate.js');

const fileCollectionsMap = new Map() // 所有文件的中文map集合，例如{文件A： [], 文件B：[]}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem', // `problem`, `suggestion`, or `layout`
    docs: {
      description: "This rule helps to find out where chinese characters are in vuejs project",
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
        properties: {
          savePath: {type: 'string'},
          saveType: {type: 'json'},
          langs: {type: 'array'},
          removeUnusedKeys: {type: 'boolean'}
        },
        additionalProperties: false
      }
    ], // Add a schema if the rule has options
    messages: {
      notAllowChinese: "Not Allow Using Chinese Character in {{ type }} -> {{ identifier }}"
    }, // Add messageId and message
  },

  create(context) {
    // variables should be defined here
    const filename = context.filename || context.getFilename() || '' // 低版本eslint没有filename属性
    const config = context.options[1]

    const newCollections = []
    let oldCollections = []
    if(!fileCollectionsMap.has(filename)) {
      fileCollectionsMap.set(filename, newCollections)
    }else {
      oldCollections = fileCollectionsMap.get(filename)
    }

    const scriptVisitor = {
      Literal(node) {
        // 注意: '中文'和this.$lang('中文')类型都是Literal
        // 导致：每次 ESLint 执行 fix 时，如果同样的 Literal 节点被多次处理，那么每次都会在之前已经处理的基础上再添加一层 this.$lang，导致出现嵌套的问题
        // generate放在literal执行的原因是，所有的节点被$lang包裹处理后都会变成literal类型
        // 解决：
        if (isAlreadyWrapped(node)) {
           // 1. 生成语言包
           if(!newCollections.includes(node.value)) {
              newCollections.push(node.value) 
              if(newCollections.length === oldCollections.length) {
                const differences = diff(oldCollections, newCollections)
                fileCollectionsMap.set(filename, newCollections)
                if(!differences.length) return 
                return generate(newCollections, config, differences)
              }  
            }  
           return
        }
        if (isString(node.value) && isChineseChar(node.value)) {
          context.report({ 
            node,
            messageId: "notAllowChinese",
            data: {
              identifier: node.value,
              type: 'Literal'
            },
            fix(fixer){
              /**
               * 1. 脚本中中文包裹$lang函数（jsx写法需要特殊处理！！！！！！！！！！！！！！）
               */
              const thisPrefix = isVueFile(filename) ? !isInsideVueTemplate(node) ? 'this.$lang' : '$lang' : 'lang'   
              const fixed = `${thisPrefix}('${node.value}')`
              const fixers = [
                fixer.replaceText(node, fixed)
              ]
              /**
               * 2. 非vue文件的脚本中引入$lang函数，需要导入对应的函数
               */
              const langImport = ensureLangImported(context, fixer)
              langImport && fixers.push(langImport)
              return fixers
            }
          });
        }
      },
      TemplateLiteral(node) {
        const {quasis = [], expressions=[]} = node
        // 1. 处理expressions
        // 两种情况 1.单变量 xxx${name}xxxx 2.对象属性 xxx${item.name}xxx
        // 将变量名推入到 `variables` 数组
        let fullExpression = ''
        let variables = {}
        expressions.forEach(expression => {
          // 获取完整的 MemberExpression 字符串
          fullExpression = getFullMemberExpression(expression);
          if(expression?.name) {
            variables[expression.name] = expression.name
          }else if(expression?.property?.name) {
            const propertyName = expression.property.name
            // variables[propertyName] = `${expressions[index].object.name}.${propertyName}`
            variables[propertyName] = `${fullExpression}`
          }
      });

        // 2. 处理quasis: 提取所有中文并拼接
        let  chineseStr = ''
        quasis.forEach(({value: {raw}}, index) => {
          if (isString(raw) && isChineseChar(raw)) {
            if(isHTMLTag(raw)) {
              const trimed = raw.trim()
              raw = replaceHtmlTag(trimed)
            }
            // 如果文本部分包含中文字符，将其添加到 `chineseStr`
            chineseStr+=raw
            // 拼接变量
            const variable = Object.keys(variables)[index]
            if(variable) {
              chineseStr+=`{${variable}}`
            }
          }
        })

        if(chineseStr) {
          context.report({
            node,
            messageId: 'notAllowChinese',
            data: {
              identifier: chineseStr,
              type: 'TemplateLiteral'
            },
            fix(fixer) {
              // 将 variables 数组转换为逗号分隔的字符串[模板字符串会将数组类型转为字符串，所以需要手动转为字符串数组]
              // const variablesStr = variables.length ? `[${variables.join(', ')}]` : '';
              // ****需要区分是模板中还是script中的
              const thisPrefix = isVueFile(filename) ? !isInsideVueTemplate(node) ? 'this.$lang' : '$lang' : 'lang'   
              // 将变量对象格式化为对象字面量
              // const variablesStr = Object.keys(variables).length ? JSON.stringify(variables) : '{}'; // !!错误，这种形式修改后的对象key和value均为字符串
              // 生成 JavaScript 对象字面量形式的变量
              const variablesStr = `{${Object.entries(variables)
                .map(([key, value]) => {
                  if(key === value) {
                    return key
                  }
                  return `${key}: ${value}`
                })
                .join(', ')}}`
              
              const fixed = `${thisPrefix}('${chineseStr}', ${variablesStr})`
              return fixer.replaceText(node, fixed)
            }
          })
        }
      },
      JSXElement(node) {
        
      }
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
        VText(node) {
          const rawText = node.value
          // literal是识别中文最后一个层级的类型
          if (isAlreadyWrapped(node)) {
            // 1. 生成语言包 
            return
          }
          if (isString(node.value) && isChineseChar(node.value)) {
            context.report({ 
              node,
              messageId: "notAllowChinese",
              data: {
                identifier: node.value,
                type: 'VText'
              },
              fix(fixer){
                // 2. 格式化（去除换行和空格等）
                const fixedText = `{{ $lang('${rawText.trim()}') }}`;
                return fixer.replaceText(node, fixedText)
              }
            });
          }
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
