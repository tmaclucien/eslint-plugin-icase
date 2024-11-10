const path = require('path')
const {existsSync, mkdirSync, writeFileSync} = require('fs')
const { HttpsProxyAgent } = require('https-proxy-agent')
const OpenAI = require('openai')
const dotenv = require('dotenv')
const cliProgress = require('cli-progress')
const colors = require('ansi-colors');

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
      // 去掉 `..json` 或者多余的格式声明
      let content = res.choices[0].message.content
      if (content.startsWith('```json')) {
        content = content.replace(/```json|```/g, '').trim();
      }
      return content
    } catch (error) {
      console.log(error)
    }
}


/**
 * 生成语言包
 */
const generate = (chunks, config) => {
  const {savePath, saveType='json', langs=[]} = config
  // // 1. 语言包目录是否存在
  const localeDir = path.join(process.cwd(), savePath)
  const dirExist = existsSync(localeDir)
  if(!dirExist) {
    mkdirSync(localeDir, {recursive: false})
  }

  langs.forEach(async (lang) => {
    // 创建进度条
    const progressBar = new cliProgress.SingleBar({
      format: `${lang}.${saveType} => |${colors.cyan('{bar}')}| {percentage}% || {value}/{total} Chunks`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    progressBar.start(chunks.length, 0);

    const translatedChunks = []

    for(let chunk of chunks) {
      if (lang === 'zh-CN') {
        translatedChunks.push(Object.fromEntries(chunk))
        // 更新进度条
        progressBar.increment();
      }else {
        const content = await translate(Object.fromEntries(chunk), lang)
        translatedChunks.push(JSON.parse(content))
        // 更新进度条
        progressBar.increment();
      } 
    }

    progressBar.stop();

    const translations = translatedChunks.reduce((acc, obj) => {
      return {...acc, ...obj}
    }, {})
   
    // 2. 覆盖文件
    const filePath = path.join(localeDir, `${lang}.${saveType}`)
    writeFileSync(filePath, JSON.stringify(translations))
  })
}




module.exports = {
  generate
}