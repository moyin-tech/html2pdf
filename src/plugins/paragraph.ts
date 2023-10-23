/* eslint-disable no-continue */
import MarkdownIt from 'markdown-it'

export const paragraphPlugin = (md: MarkdownIt) => {
  md.block.ruler.at('paragraph', paragraph, { alt: [] })
}

function getLine(state: any, line: any) {
  const pos = state.bMarks[line] + state.tShift[line]
  const max = state.eMarks[line]

  return state.src.slice(pos, max)
}

function paragraph(state: any, startLine: any, endLine: any) {
  let terminate: any
  let i: any
  let l: any
  let token: any
  let nextLine = startLine + 1
  const terminatorRules = state.md.block.ruler.getRules('paragraph')

  const oldParentType = state.parentType
  state.parentType = 'paragraph'

  const lineText = getLine(state, startLine)
  if (lineText.startsWith('$$moyinVideo')) {
    // jump line-by-line until empty one or EOF
    for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
      // this would be a code block normally, but after paragraph
      // it's considered a lazy continuation regardless of what's there
      if (state.sCount[nextLine] - state.blkIndent > 3) {
        continue
      }

      // quirk for blockquotes, this line should already be checked by that rule
      if (state.sCount[nextLine] < 0) {
        continue
      }

      // Some tags can terminate paragraph without empty line.
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
    }
  }

  const content = state
    .getLines(startLine, nextLine, state.blkIndent, false)
    .trim()

  state.line = nextLine

  token = state.push('paragraph_open', 'p', 1)
  token.map = [startLine, state.line]

  token = state.push('inline', '', 0)
  token.content = content
  token.map = [startLine, state.line]
  token.children = []

  token = state.push('paragraph_close', 'p', -1)

  state.parentType = oldParentType

  return true
}
