import MarkdownIt from 'markdown-it'

export const tablePlugin = (md: MarkdownIt) => {
  md.block.ruler.at('table', table, { alt: ['paragraph', 'reference'] })
  // md.renderer.rules.table = (tokens, idx, options, env, self) => {
  //   console.log('table render called')
  //   const token = tokens[idx]
  //   console.log(token)
  //   // const url = token.attrGet('src')
  //   // if (url && url.indexOf('#w') !== -1) {
  //   //   const parts = url.split('#w')
  //   //   if (parts[1] && /^(\d+)(\.\d+)?px$/.test(parts[1])) {
  //   //     token.attrSet('width', parts[1])
  //   //   }
  //   // }
  //   return self.renderToken(tokens, idx, options)
  // }
}

function getSpanInfo(content: string, type: string, oppositeType: string): any {
  const reSpan = new RegExp(
    `^((?:${oppositeType}=[0-9]+:)?)${type}=([0-9]+):(.*)`
  )
  const parsed = reSpan.exec(content)
  let spanCount = 1

  if (parsed) {
    spanCount = parseInt(parsed[2], 10)
    content = parsed[1] + parsed[3]
  }

  return [spanCount, content]
}

function isSpace(code: any) {
  switch (code) {
    case 0x09:
    case 0x20:
      return true
    default:
      return false
  }
}

function getLine(state: any, line: any) {
  const pos = state.bMarks[line] + state.tShift[line]
  const max = state.eMarks[line]

  return state.src.slice(pos, max)
}

// const handleContentMaxLen = (val = '') => {
//   const valStr = val
//     .trim()
//     .replace(/(^\**)|(\**$)/g, '')
//     .replace(/(^~~)|(~~$)/g, '')
//     .replace(/\*/g, '')
//     .replace(/\\/g, '')
//     .replace(/(?<!!)\[(.*?)\]\((.*?)\)/ig, '$1') // 提取链接中的文字
//
//   let res = 0
//
//   valStr.split('<br>').forEach((str) => {
//     const strr = str.replace(/<[^>]*>/g, '')
//     let len = 32;
//     for (let i = 0; i < strr.length; i++) {
//       const length = strr.charCodeAt(i);
//       if (length >= 0 && length <= 128) {
//         const reg = /^[A-Z]+$/
//         if (reg.test(strr[i])) { // 大写字母宽1px
//           len += 10;
//         } else {
//           len += 9;
//         }
//       } else {
//         len += 16;
//       }
//     }
//
//     if (len > res) {
//       res = len
//     }
//   })
//
//   return res + 10
//
//   // const div = document.createElement('div');
//   // div.innerHTML = val;
//   // const span = div.childNodes[0];
//   // const body = document.getElementsByTagName('body')[0];
//   // body.appendChild(span);
//   // // @ts-ignore
//   // const res = span.offsetWidth || 0
//   // span.remove()
//   // return res + 10
// }

// const handleCellWidthPretty = (colList:any[]) => {
//   const fixAverage = (list:number[]) => {
//     let res = 0
//     list.sort((a, b) => a - b);
//     const index = Math.floor(list.length / 100 * 90)
//     if (list[index] && list[index] > 0) {
//       res = list[index]
//     }
//     if (res >= 600) {
//       res = 600
//     }
//     if (res <= 40) {
//       res = 40
//     }
//     return res
//   }
//   let maxWidthSum = 0
//   const cellWidthAndIndexList :any[] = []
//   for (let i = 0; i < colList.length; i++) {
//     const colToken = colList[i]
//     colToken.averageWidth = fixAverage(colToken.cellWidthList)
//     maxWidthSum += colToken.averageWidth
//     cellWidthAndIndexList.push({
//       index: i,
//       width: colToken.averageWidth,
//     })
//   }
//   if (maxWidthSum > 1080 && maxWidthSum < 1300) {
//     cellWidthAndIndexList.sort((a, b) => a.width - b.width)
//     const diffValue = maxWidthSum - 1080
//     const seventyPercentileIndex = Math.floor(cellWidthAndIndexList.length / 100 * 70)
//     let greaterThanSeventyPercentileSum = 0
//     for (let i = seventyPercentileIndex; i < cellWidthAndIndexList.length; i++) {
//       greaterThanSeventyPercentileSum += cellWidthAndIndexList[i].width
//     }
//     if (greaterThanSeventyPercentileSum === 0) {
//       return
//     }
//     for (let i = cellWidthAndIndexList.length - 1; i > seventyPercentileIndex; i--) {
//       const item = cellWidthAndIndexList[i]
//       colList[item.index].averageWidth = colList[item.index].averageWidth - Math.ceil(item.width / greaterThanSeventyPercentileSum * diffValue) - 10
//     }
//   }
// }

function escapedSplit(str: any) {
  const result: string[] = []
  let pos = 0
  const max = str.length
  let ch
  let isEscaped = false
  let lastPos = 0
  let current = ''

  ch = str.charCodeAt(pos)

  while (pos < max) {
    if (ch === 0x7c /* | */) {
      if (!isEscaped) {
        // pipe separating cells, '|'
        result.push(current + str.substring(lastPos, pos))
        current = ''
        lastPos = pos + 1
      } else {
        // escaped pipe, '\|'
        current += str.substring(lastPos, pos - 1)
        lastPos = pos
      }
    }

    isEscaped = ch === 0x5c /* \ */
    pos++

    ch = str.charCodeAt(pos)
  }

  result.push(current + str.substring(lastPos))

  return result
}

/**
 *  标记好当前是哪一行
 *  从哪一列开始列数+1 有可能重叠+1+1
 *  写一个class 存储 用当前行和当前列 去get需要+几
 *  set的时候 set 行数、列数、rowSpan数
 *  */
// class TableRowspanHandler {
//   constructor() {
//     this.rowspanMap = new Map()
//   }
//
//   private rowspanMap: any = new Map();
//
//   reset() {
//     this.rowspanMap.clear()
//   }
//
//   setRowSpan(curLine: number, curIndex: number, rowspan: number, colArrLen: number) {
//     for (let i = curIndex; i < colArrLen; i++) {
//       for (let j = curLine + 1; j < curLine + rowspan; j++) {
//         const key = `${j}-${i}`
//         if (this.rowspanMap.get(key)) {
//           this.rowspanMap.set(key, this.rowspanMap.get(key) + 1)
//         } else {
//           this.rowspanMap.set(key, 1)
//         }
//       }
//     }
//   }
//
//   getOffsetByCoordinate(curLine: number, curIndex: number) {
//     const key = `${curLine}-${curIndex}`
//     if (this.rowspanMap.get(key)) {
//       const res = this.rowspanMap.get(key)
//       this.rowspanMap.set(key, this.rowspanMap.get(key) - 1)
//       if (this.rowspanMap.get(key) <= 0) {
//         this.rowspanMap.delete(key)
//       }
//       return res
//     }
//     return 0
//   }
// }

function table(state: any, startLine: any, endLine: any, silent: any) {
  let ch
  let lineText
  let pos
  let i
  let l
  let nextLine
  let columns
  let token
  let t
  let tableLines
  let tbodyLines
  let terminate

  // should have at least two lines
  if (startLine + 2 > endLine) {
    return false
  }

  nextLine = startLine + 1

  if (state.sCount[nextLine] < state.blkIndent) {
    return false
  }

  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[nextLine] - state.blkIndent >= 4) {
    return false
  }

  // first character of the second line should be '|', '-', ':',
  // and no other characters are allowed but spaces;
  // basically, this is the equivalent of /^[-:|][-:|\s]*$/ regexp

  pos = state.bMarks[nextLine] + state.tShift[nextLine]
  if (pos >= state.eMarks[nextLine]) {
    return false
  }

  const firstCh = state.src.charCodeAt(pos++)
  if (
    firstCh !== 0x7c /* | */ &&
    firstCh !== 0x2d /* - */ &&
    firstCh !== 0x3a /* : */
  ) {
    return false
  }

  if (pos >= state.eMarks[nextLine]) {
    return false
  }

  const secondCh = state.src.charCodeAt(pos++)
  if (
    secondCh !== 0x7c /* | */ &&
    secondCh !== 0x2d /* - */ &&
    secondCh !== 0x3a /* : */ &&
    !isSpace(secondCh)
  ) {
    return false
  }

  // if first character is '-', then second character must not be a space
  // (due to parsing ambiguity with list)
  if (firstCh === 0x2d /* - */ && isSpace(secondCh)) {
    return false
  }

  while (pos < state.eMarks[nextLine]) {
    ch = state.src.charCodeAt(pos)

    if (
      ch !== 0x7c /* | */ &&
      ch !== 0x2d /* - */ &&
      ch !== 0x3a /* : */ &&
      !isSpace(ch)
    ) {
      return false
    }

    pos++
  }

  lineText = getLine(state, startLine + 1)

  columns = lineText.split('|')
  const aligns: string[] = []
  for (i = 0; i < columns.length; i++) {
    t = columns[i].trim()
    if (!t) {
      // allow empty columns before and after table, but not in between columns;
      // e.g. allow ` |---| `, disallow ` ---||--- `
      if (i === 0 || i === columns.length - 1) {
        // eslint-disable-next-line no-continue
        continue
      } else {
        return false
      }
    }

    if (!/^:?-+:?$/.test(t)) {
      return false
    }
    if (t.charCodeAt(t.length - 1) === 0x3a /* : */) {
      aligns.push(t.charCodeAt(0) === 0x3a /* : */ ? 'center' : 'right')
    } else if (t.charCodeAt(0) === 0x3a /* : */) {
      aligns.push('left')
    } else {
      aligns.push('')
    }
  }

  lineText = getLine(state, startLine).trim()
  if (lineText.indexOf('|') === -1) {
    return false
  }
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false
  }
  columns = escapedSplit(lineText)
  if (columns.length && columns[0] === '') columns.shift()
  if (columns.length && columns[columns.length - 1] === '') columns.pop()

  // header row will define an amount of columns in the entire table,
  // and align row should be exactly the same (the rest of the rows can differ)
  // const columnCount = columns.length;
  // if (columnCount === 0 || columnCount !== aligns.length) { return false; }

  if (silent) {
    return true
  }

  const oldParentType = state.parentType
  state.parentType = 'table'

  // use 'blockquote' lists for termination because it's
  // the most similar to tables
  const terminatorRules = state.md.block.ruler.getRules('blockquote')
  token = state.push('table_box_open', 'div', 1)
  token.attrs = [['class', 'table-box']]

  token = state.push('table_open', 'table', 1)
  token.map = tableLines = [startLine, 0]

  // colgroup start
  const colList: any[] = []
  for (let index = 0; index < columns.length; index++) {
    const columnContent = columns[index] ? columns[index].trim() : ''
    let [colspan, _] = [1, 1]
    ;[colspan, _] = getSpanInfo(columnContent, '@cols', '@rows')
    for (let j = 0; j < colspan; j++) {
      // token = state.push('col_control', 'col', 1)
      // token.attrs = [['width', 0]]
      colList.push({
        averageWidth: 0,
        cellWidthList: []
      })
    }
  }
  // colgroup end
  token = state.push('thead_open', 'thead', 1)
  token.map = [startLine, startLine + 1]

  token = state.push('tr_open', 'tr', 1)
  token.map = [startLine, startLine + 1]

  // let colspanSum = 0
  // const tableRowspanHandler = new TableRowspanHandler() as any
  // for (i = 0; i < columns.length; i++) {
  //   let content = columns[i] ? columns[i].trim() : '';
  //   let [colspan, rowspan] = [1, 1];
  //   [colspan, content] = getSpanInfo(content, '@cols', '@rows');
  //   [rowspan, content] = getSpanInfo(content, '@rows', '@cols');
  //   const colToken = colList[i + colspanSum]
  //   if (colspan > 1) {
  //     colspanSum += (colspan - 1)
  //   }
  //   if (colToken) {
  //     const contentLength = handleContentMaxLen(content) > 600 ? 600 : handleContentMaxLen(content)
  //     colToken.cellWidthList.push(contentLength)
  //   }
  // }
  //
  // tableRowspanHandler.reset()
  // for (nextLine = startLine + 2; nextLine < endLine; nextLine++) {
  //   lineText = getLine(state, nextLine).trim();
  //   if (!lineText) { break; }
  //   if (state.sCount[nextLine] - state.blkIndent >= 4) { break; }
  //   const rowColumns = escapedSplit(lineText);
  //   if (rowColumns.length && rowColumns[0] === '') rowColumns.shift();
  //   if (rowColumns.length && rowColumns[rowColumns.length - 1] === '') rowColumns.pop();
  //   colspanSum = 0
  //   for (i = 0; i < rowColumns.length; i++) {
  //     let content = rowColumns[i] ? rowColumns[i].trim() : '';
  //     let [colspan, rowspan] = [1, 1];
  //     [colspan, content] = getSpanInfo(content, '@cols', '@rows');
  //     [rowspan, content] = getSpanInfo(content, '@rows', '@cols');
  //     const colToken = colList[i + colspanSum + tableRowspanHandler.getOffsetByCoordinate(nextLine - startLine, i)]
  //
  //     if (colspan > 1) {
  //       colspanSum += (colspan - 1)
  //     }
  //     if (rowspan > 1) {
  //       tableRowspanHandler.setRowSpan(nextLine - startLine, i, rowspan, colList.length)
  //     }
  //     if (colToken) {
  //       const contentLength = handleContentMaxLen(content) > 600 ? 600 : handleContentMaxLen(content)
  //       colToken.cellWidthList.push(contentLength)
  //     }
  //   }
  // }

  // if (colList.length > 0) {
  //   handleCellWidthPretty(colList)
  // }

  for (i = 0; i < columns.length; i++) {
    // const colToken = colList[i];
    token = state.push('th_open', 'th', 1)
    // let style = colToken && colToken.averageWidth > 0 ? `width: ${colToken.averageWidth}px;min-width: ${colToken.averageWidth}px;` : ''
    let style = ''
    if (aligns[i]) {
      style += `text-align:${aligns[i]};`
    }
    token.attrs = [['style', style]]
    let content = columns[i] ? columns[i].trim() : ''
    let [colspan, rowspan] = [1, 1]
    ;[colspan, content] = getSpanInfo(content, '@cols', '@rows')
    ;[rowspan, content] = getSpanInfo(content, '@rows', '@cols')
    if (colspan > 1) {
      token.attrs.push(['colspan', colspan])
    }
    if (rowspan > 1) {
      token.attrs.push(['rowspan', rowspan])
    }

    token = state.push('inline', '', 0)
    token.content = content
    token.children = []

    token = state.push('th_close', 'th', -1)
  }

  token = state.push('tr_close', 'tr', -1)
  token = state.push('thead_close', 'thead', -1)

  // tableRowspanHandler.reset()
  for (nextLine = startLine + 2; nextLine < endLine; nextLine++) {
    if (state.sCount[nextLine] < state.blkIndent) {
      break
    }

    terminate = false
    for (i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true
        break
      }
    }

    if (terminate) {
      break
    }
    lineText = getLine(state, nextLine).trim()
    if (/```([\s\S]{1})/g.test(lineText)) {
      lineText = lineText.replace(/```([\s\S]{1})/g, '\n```$1')
      for (;;) {
        nextLine++
        if (nextLine >= endLine) {
          break
        }
        const lineContent = getLine(state, nextLine)
        lineText += `\n${lineContent}`
        if (lineContent.startsWith('```')) {
          nextLine++
          if (nextLine >= endLine) {
            break
          }
          const lineContentEnd = getLine(state, nextLine).trim()
          lineText += `\n${lineContentEnd}`
          break
        }
      }
    }
    if (!lineText) {
      break
    }
    if (state.sCount[nextLine] - state.blkIndent >= 4) {
      break
    }
    columns = escapedSplit(lineText)
    if (columns.length && columns[0] === '') columns.shift()
    if (columns.length && columns[columns.length - 1] === '') columns.pop()

    if (nextLine === startLine + 2) {
      token = state.push('tbody_open', 'tbody', 1)
      token.map = tbodyLines = [startLine + 2, 0]
    }

    token = state.push('tr_open', 'tr', 1)
    token.map = [nextLine, nextLine + 1]
    for (i = 0; i < columns.length; i++) {
      // const colToken = colList[i + tableRowspanHandler.getOffsetByCoordinate(nextLine - startLine, i)];
      token = state.push('td_open', 'td', 1)
      token.attrs = []
      // let style = colToken && colToken.averageWidth > 0 ? `width: ${colToken.averageWidth}px;min-width: ${colToken.averageWidth}px;` : ''
      let style = ''
      if (aligns[i]) {
        style += `text-align:${aligns[i]};`
      }
      let content = columns[i] ? columns[i].trim() : ''
      let [colspan, rowspan] = [1, 1]
      ;[colspan, content] = getSpanInfo(content, '@cols', '@rows')
      ;[rowspan, content] = getSpanInfo(content, '@rows', '@cols')
      if (colspan > 1) {
        token.attrs.push(['colspan', colspan])
      }
      if (rowspan > 1) {
        token.attrs.push(['rowspan', rowspan])
        style += 'background: #fff;'
        // tableRowspanHandler.setRowSpan(nextLine - startLine, i, rowspan, colList.length)
      }
      token.attrs.push(['style', style])
      token = state.push('inline', '', 0)
      if (/```([\s\S]{1})/g.test(content)) {
        content = state.md.render(content)
      }

      token.content = content
      // token.content = columns[i] ? columns[i].trim() : '';
      token.children = []

      token = state.push('td_close', 'td', -1)
    }
    token = state.push('tr_close', 'tr', -1)
  }

  if (tbodyLines) {
    token = state.push('tbody_close', 'tbody', -1)
    tbodyLines[1] = nextLine
  }

  token = state.push('table_close', 'table', -1)
  token = state.push('table_box_close', 'div', -1)
  tableLines[1] = nextLine

  state.parentType = oldParentType
  state.line = nextLine
  return true
}
