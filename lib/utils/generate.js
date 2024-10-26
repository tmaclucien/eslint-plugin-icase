const path = require('path')
const {existsSync, mkdirSync, writeFileSync} = require('fs')
const { HttpsProxyAgent } = require('https-proxy-agent')
const OpenAI = require('openai')
const dotenv = require('dotenv')

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.VUE_APP_GPT_API_KEY,
  organization: process.env.VUE_APP_GPT_ORGANIZATION_KEY,
  project: process.env.VUE_APP_GPT_PROJECT_KEY,
  httpAgent: new HttpsProxyAgent('http://127.0.0.1:33210/')
})


/**
 * 文本翻译
 * @returns
 */
const translate = async (input, targetLang) => {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'assistant', content: `Please translate the text content into ${targetLang} and return it in the same format.` },
          { role: 'user', content: JSON.stringify(input) }
        ],
        temperature: 0.1,
        max_tokens: 3000
      })
      return res.choices[0].message.content
    } catch (error) {
      console.log(error)
    }
}


/**
 * 生成语言包
 */
const generate = (collections, config) => {
  const {savePath, saveType='json', langs=[]} = config
  // // 1. 语言包目录是否存在
  const localeDir = path.join(process.cwd(), savePath)
  const dirExist = existsSync(localeDir)
  if(!dirExist) {
    mkdirSync(localeDir, {recursive: false})
  }
  langs.forEach(async (lang) => {
    const content = await translate(collections, lang)
    // 2. 覆盖文件
    const filePath = path.join(localeDir, `${lang}.${saveType}`)
    writeFileSync(filePath, content)
  })
}




module.exports = {
  generate
}