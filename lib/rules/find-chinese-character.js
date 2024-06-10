const { isString, isChineseChar } = require('../utils/helper.js');
const { report } = require('../utils/report.js');

module.exports = {
  meta: {
    type: 'problem', // problem/suggestion/layout
    docs: {
      description: 'This rule helps to find out where chinese characters are',
    },
    messages: {
      notAllowChinese: "Not Allow Using Chinese Character '{{ identifier }}'"
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    /**
     * 1. return visitor functions to visit the ast nodes
     * 2. If a key is a node type or a selector, ESLint calls that visitor function
     */
    return {
      Literal(node) {
        if (isString(node.raw) && isChineseChar(node.raw)) {
          report({
            context,
            node,
            messageId: "notAllowChinese",
            identifier: node.raw,
          });
        }
      },
    };
  },
};
