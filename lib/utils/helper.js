// const path = require('path')

/**
 * test if input val is chinese character or not
 * @param {*} value input value
 * @returns true or false
 */
const isChineseChar = (value) => {
  const regex = /[\u4E00-\u9FFF]/;
  return regex.test(value)
}

/**
 * test if input val is string type
 * @param {*} value 
 * @returns 
 */
const isString = (value) => {
  return Object.prototype.toString.call(value) === '[object String]'
}

/**
 * test if val is Map type
 * @param {*} value 
 * @returns 
 */
const isMap = (value) => {
  return Object.prototype.toString.call(value) === '[object Map]'
}

/**
 * 检查当前路径是否为vue文件
 * @param {*} filename 
 * @returns boolean
 */
const isVueFile = (filename) => {
  return filename.endsWith('.vue')
}

/**
 * 模板字符串是否含有html标签
 */
const isHTMLTag = (value) => {
  const htmlTagPattern = /<[^>]*>/g; // 匹配 HTML 标签
  return htmlTagPattern.test(value)
}

/**
 * 替换HTML标签
 */
const replaceHtmlTag = (value) => {
  const htmlTagPattern = /<[^>]*>/g; // 匹配 HTML 标签
  return value.replace(htmlTagPattern, '') // 将 HTML 标签替换为空字符串
}

/**
 * map对象片段分割
 */
function splitMapIntoChunks(map, chunkSize=100) {
  const chunks = [];
  let currentChunk = new Map();
  
  for (let [key, value] of map.entries()) {
    currentChunk.set(key, value);
    if (currentChunk.size >= chunkSize) {
      chunks.push(currentChunk);
      currentChunk = new Map();
    }
  }
  
  if (currentChunk.size > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * map对象片段合并
 */
function mergeChunks (chunks) {
  const mergedMap = new Map();
  for (let chunk of chunks) {
    for (let [key, value] of chunk.entries()) {
      mergedMap.set(key, value);
    }
  }
  return mergedMap;
};

module.exports = {
  isChineseChar,
  isString,
  isMap,
  isVueFile,
  isHTMLTag,
  replaceHtmlTag,
  splitMapIntoChunks,
  mergeChunks,
}