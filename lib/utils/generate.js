const path = require('path')
const {existsSync, mkdirSync, writeFileSync, readFileSync} = require('fs')
const {crc32} = require('crc')


/**
 * 生成语言包
 * 1. 目前还未解决整段删除代码联动删除对应的key，新增没问题（既newColletions和oldCollections数组长度不一致）
 */
const generate = (textArr=[], config, differences=[]) => {
  const {savePath, saveType='json', langs=[]} = config
  // 1. 语言包目录是否存在
  const localeDir = path.join(process.cwd(), savePath)
  const dirExist = existsSync(localeDir)
  if(!dirExist) {
    mkdirSync(localeDir, {recursive: false})
  }
  // 2. 语言包文件是否存在
  langs.forEach(lang => {
    const filePath = path.join(localeDir, `${lang}.${saveType}`)
    const fileExist = existsSync(filePath)
    // 不存在：创建+写; 存在：读+写
    const content = fileExist ? readFileSync(filePath, 'utf-8') ? JSON.parse(readFileSync(filePath, 'utf-8')) : {} : {}
    textArr.forEach((text) => {
      if(!text) return
      // 将中文转换成crc32格式去匹配对应的json语言包
      const hashKey = crc32(text).toString(16)
      if(content[hashKey]) return
      content[hashKey] = text
    })
    // 找到历史值并去除
    differences.forEach(({oldVal}) => {
      const oldHashKey = crc32(oldVal).toString(16)
      if(content[oldHashKey]) delete content[oldHashKey]
    })
    // 3. 覆盖文件
    writeFileSync(filePath, JSON.stringify(content))
  })
}

/**
 * 中文数据变更
 * @param {*} oldArr 
 * @param {*} newArr 
 * @returns 
 */
const diff = (oldArr, newArr) => {
  // if (oldArr.length !== newArr.length) {
  //   throw new Error('数组长度不一致');
  // }
  const differences = [];
  
  for (let i = 0; i < oldArr.length; i++) {
    if ( oldArr[i] && oldArr[i] !== newArr[i]) {
      differences.push({ index: i, oldVal: oldArr[i], newVal: newArr[i] });
    }
  }
  console.log(differences)
  return differences;
}

module.exports = {
  generate,
  diff
}