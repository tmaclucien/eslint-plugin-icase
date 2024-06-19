/**
 * @fileoverview find chinese character in the vue project
 * @author lucien
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/find-chinese-character"),
  RuleTester = require("eslint").RuleTester;


//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('vue-eslint-parser'),
    ecmaVersion: 'latest'
  }
});
ruleTester.run("find-chinese-character", rule, {
  valid: [
    // give me some code that won't trigger a warning
    {
      code: 'const x = "icase eslint plugin"',
    },
    {
      code: '<p>icase eslint plugin</p>',
    }
  ],

  invalid: [
    {
      code: 'const x = "会话智能国际化插件"',
      errors: ["notAllowChinese"],
    },
    {
      code: '<p>会话智能国际化插件</p>',
      errors: ["notAllowChinese"],
    },
  ],
});
