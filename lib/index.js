/**
 * @fileoverview eslint plugin for icase international
 * @author lucien
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const requireIndex = require("requireindex");

//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------


// import all rules in lib/rules
module.exports.rules = requireIndex(__dirname + "/rules");

module.exports.configs = {
  recommended: {
    plugins: ['icase'],
    rules: {
      'icase/find-chinese-character': [2],
      'icase/no-unused-locale-key': [2]
    }
  }
};



