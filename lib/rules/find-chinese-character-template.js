const { defineTemplateBodyVisitor, isString, isChineseChar } = require('../utils/helper.js');
const { report } = require('../utils/report.js');


module.exports = {
  meta: {
    type: 'problem', // problem/suggestion/layout
    docs: {
      description: 'This rule helps to find out where chinese characters are in vue template',
    },
    messages: {
      notAllowChinese: "Not Allow Using Chinese Character '{{ identifier }}'"
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    // const sourceCode = context.getSourceCode()
    // const template =
    //   sourceCode.parserServices.getTemplateBodyTokenStore &&
    //   sourceCode.parserServices.getTemplateBodyTokenStore()

    return defineTemplateBodyVisitor(context, {
      'VText'(node) {
        if (isString(node.value) && isChineseChar(node.value)) {
          report({
            context,
            node,
            messageId: "notAllowChinese",
            identifier: node.value,
          });
        }
      }
    })
  },
};
