/**
 * @fileoverview find chinese character in the vue project
 * @author lucien
 * 此规则只在使用cli命令行npm run eslint生效
 */
"use strict";
const { 
  defineTemplateBodyVisitor, 
  isAlreadyWrapped, 
} = require('../utils/helper.js');
const { generate } = require('../utils/generate.js');
const {crc32} = require('crc')
const collections = new Map() // 收集所有静态$lang包裹的中文

// 存储 ESLint 规则的配置信息
let ruleConfig = {};
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
          langs: {type: 'array'}
        },
        additionalProperties: false
      }
    ], // Add a schema if the rule has options
    messages: {
      mark: "mark $lang"
    }, // Add messageId and message
  },

  /**
   * 每一个文件都会执行create函数，既context上下文指向当前文件
   * @param {*} context 
   * @returns 
  */
  create(context) {
    // variables should be defined here
    const isInVSCode = !!process.env.VSCODE_PID
    if(isInVSCode) return {}

    ruleConfig = context.options[1]
    
    const scriptVisitor = {
      Literal(node) {
        if (isAlreadyWrapped(node)) {
           const hashKey = crc32(node.value).toString(16)
          if(collections.has(hashKey)) return
          collections.set(hashKey, node.value)
        }
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
        Literal(node) {
          scriptVisitor['Literal'](node)
        },
      },
      // script visitors
      scriptVisitor
    )
  },
};

let hasGenerated = false;
// process.on('exit') 中的代码必须是同步的，因为 Node 在 exit 事件上不会等待任何未完成的异步操作。如果 generate 函数包含异步操作（例如 await translate(...)），那么在 ESLint CLI 运行结束并触发 exit 时，可能无法完成请求，导致请求被直接中断。
process.on('beforeExit', () => {
  // console.log('Final collected content across all files:', collections);
  if(!collections.size || hasGenerated) return 'successfully generation'
  generate(Object.fromEntries(collections), ruleConfig)
  hasGenerated = true
});