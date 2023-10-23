import MarkdownIt from 'markdown-it'

export const htmlBlockPlugin = (md: MarkdownIt) => {
  md.block.ruler.at('html_block', html_block, {
    alt: ['paragraph', 'reference', 'blockquote']
  })
}

const block_names = [
  'address',
  'article',
  'aside',
  'base',
  'basefont',
  'blockquote',
  'body',
  'caption',
  'center',
  'col',
  'colgroup',
  'dd',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'frame',
  'frameset',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hr',
  'html',
  'iframe',
  'legend',
  'li',
  'link',
  'main',
  'menu',
  'menuitem',
  'nav',
  'noframes',
  'ol',
  'optgroup',
  'option',
  'p',
  'param',
  'section',
  'source',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'title',
  'tr',
  'track',
  'ul'
]
const attr_name = '[a-zA-Z_:][a-zA-Z0-9:._-]*'
const unquoted = '[^"\'=<>`\\x00-\\x20]+'
const single_quoted = "'[^']*'"
const double_quoted = '"[^"]*"'

const attr_value = `(?:${unquoted}|${single_quoted}|${double_quoted})`

const attribute = `(?:\\s+${attr_name}(?:\\s*=\\s*${attr_value})?)`

const open_tag = `<[A-Za-z][A-Za-z0-9\\-]*${attribute}*\\s*\\/?>`

const close_tag = '<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>'
const comment = '<!---->|<!--(?:-?[^>-])(?:-?[^-])*-->'
const processing = '<[?][\\s\\S]*?[?]>'
const declaration = '<![A-Z]+\\s+[^>]*>'
const cdata = '<!\\[CDATA\\[[\\s\\S]*?\\]\\]>'

const HTML_TAG_RE = new RegExp(
  `^(?:${open_tag}|${close_tag}|${comment}|${processing}|${declaration}|${cdata})`
)
const HTML_OPEN_CLOSE_TAG_RE = new RegExp(`^(?:${open_tag}|${close_tag})`)

const HTML_SEQUENCES = [
  [
    /^<(script|pre|style|textarea)(?=(\s|>|$))/i,
    /<\/(script|pre|style|textarea)>/i,
    true
  ],
  [/^<!--/, /-->/, true],
  [/^<\?/, /\?>/, true],
  [/^<![A-Z]/, />/, true],
  [/^<!\[CDATA\[/, /\]\]>/, true],
  [
    new RegExp(`^</?(${block_names.join('|')})(?=(\\s|/?>|$))`, 'i'),
    new RegExp(`(</(${block_names.join('|')})>|^)$`, 'i'),
    true
  ],
  [new RegExp(`${HTML_OPEN_CLOSE_TAG_RE.source}\\s*$`), /^$/, false]
]

function html_block(
  state: any,
  startLine: number,
  endLine: number,
  silent: boolean
) {
  let i
  let nextLine
  let lineText
  let pos = state.bMarks[startLine] + state.tShift[startLine]
  let max = state.eMarks[startLine]

  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false
  }

  if (!state.md.options.html) {
    return false
  }

  if (state.src.charCodeAt(pos) !== 0x3c /* < */) {
    return false
  }

  lineText = state.src.slice(pos, max)

  for (i = 0; i < HTML_SEQUENCES.length; i++) {
    if ((HTML_SEQUENCES[i][0] as RegExp).test(lineText)) {
      break
    }
  }

  if (i === HTML_SEQUENCES.length) {
    return false
  }

  if (silent) {
    // true if this sequence can be a terminator, false otherwise
    return HTML_SEQUENCES[i][2] as boolean
  }

  nextLine = startLine + 1

  // If we are here - we detected HTML block.
  // Let's roll down till block end.
  if (lineText.toLowerCase().indexOf('<br') === -1) {
    if (!(HTML_SEQUENCES[i][1] as RegExp).test(lineText)) {
      for (; nextLine < endLine; nextLine++) {
        if (state.sCount[nextLine] < state.blkIndent) {
          break
        }

        pos = state.bMarks[nextLine] + state.tShift[nextLine]
        max = state.eMarks[nextLine]
        lineText = state.src.slice(pos, max)

        if ((HTML_SEQUENCES[i][1] as RegExp).test(lineText)) {
          if (lineText.length !== 0) {
            nextLine++
          }
          break
        }
      }
    }
  }

  state.line = nextLine

  const token = state.push('html_block', '', 0)
  token.map = [startLine, nextLine]
  token.content = state.getLines(startLine, nextLine, state.blkIndent, true)
  return true
}
