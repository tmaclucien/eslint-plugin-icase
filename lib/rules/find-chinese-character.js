/**
 * @fileoverview find chinese character in the vue project
 * @author lucien
 */
"use strict";
const { isString, isChineseChar, defineTemplateBodyVisitor } = require('../utils/helper.js');
const { report } = require('../utils/report.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem', // `problem`, `suggestion`, or `layout`
    docs: {
      description: "This rule helps to find out where chinese characters are in vuejs project",
      recommended: false,
      url: null, // URL to the documentation page for this rule
    },
    fixable: null, // Or `code` or `whitespace`
    schema: [], // Add a schema if the rule has options
    messages: {
      notAllowChinese: "Not Allow Using Chinese Character '{{ identifier }}'"
    }, // Add messageId and message
  },

  create(context) {
    // variables should be defined here
    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    // any helper functions should go here or else delete this section

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return defineTemplateBodyVisitor(
      context,
      // template visitor
      {
        'VText, VLiteral, Literal'(node) {
          if (isString(node.value) && isChineseChar(node.value)) {
            report({
              context,
              node,
              messageId: "notAllowChinese",
              identifier: node.value,
            });
          }
        }
      },
      // script visitor
      {
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
      }
    )
  },
};
