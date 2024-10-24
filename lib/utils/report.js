/**
 * 
 * @param {*} context contains information that is relevant to the context of the rule.
 * @param {*} node The AST node related to the problem
 * @param {*} message The problem message
 * @param {*} identifier one of the node property
 */
const report = ({ context, node, identifier, messageId, fix }) => {
  context.report({  
    node,
    messageId,
    data: {
      identifier,
    },
    fix
  })
} 

module.exports = {
  report
}