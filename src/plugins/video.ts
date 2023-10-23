import MarkdownIt from 'markdown-it'

export const videoPlugin = (md: MarkdownIt, options: any) => {
  const name = 'moyinVideo'

  function renderDefault(
    tokens: any,
    idx: any,
    _options: any,
    env: any,
    slf: any
  ) {
    // add a class to the opening tag
    if (tokens[idx].nesting === 1) {
      tokens[idx].attrJoin('class', name)
    }
    return slf.renderToken(tokens, idx, _options, env, slf)
  }

  options = options || {}

  const min_markers = 2
  const marker_str = options.marker || '$'
  const marker_char = marker_str.charCodeAt(0)
  const marker_len = marker_str.length
  const render = options.render || renderDefault

  function container(
    state: any,
    startLine: number,
    endLine: number,
    silent: boolean
  ) {
    let pos
    let nextLine
    let token
    let auto_closed = false
    let start = state.bMarks[startLine] + state.tShift[startLine]
    let max = state.eMarks[startLine]

    // Check out the first character quickly,
    // this should filter out most of non-containers
    //
    if (marker_char !== state.src.charCodeAt(start)) {
      return false
    }

    // Check out the rest of the marker string
    //
    for (pos = start + 1; pos <= max; pos++) {
      if (marker_str[(pos - start) % marker_len] !== state.src[pos]) {
        break
      }
    }

    const marker_count = Math.floor((pos - start) / marker_len)
    if (marker_count < min_markers) {
      return false
    }
    pos -= (pos - start) % marker_len

    const markup = state.src.slice(start, pos)
    const params = state.src.slice(pos, max)
    if (params !== name) {
      return false
    }

    // Since start is found, we can report success here in validation mode
    //
    if (silent) {
      return true
    }

    // Search for the end of the block
    //
    nextLine = startLine

    for (;;) {
      nextLine++
      if (nextLine >= endLine) {
        // unclosed block should be autoclosed by end of document.
        // also block seems to be autoclosed by end of parent
        break
      }

      start = state.bMarks[nextLine] + state.tShift[nextLine]
      max = state.eMarks[nextLine]

      if (start < max && state.sCount[nextLine] < state.blkIndent) {
        // non-empty line with negative indent should stop the list:
        // - ```
        //  test
        break
      }

      if (marker_char !== state.src.charCodeAt(start)) {
        continue
      }

      if (state.sCount[nextLine] - state.blkIndent >= 4) {
        // closing fence should be indented less than 4 spaces
        continue
      }

      for (pos = start + 1; pos <= max; pos++) {
        if (marker_str[(pos - start) % marker_len] !== state.src[pos]) {
          break
        }
      }

      // closing code fence must be at least as long as the opening one
      if (Math.floor((pos - start) / marker_len) < marker_count) {
        continue
      }

      // make sure tail has spaces only
      pos -= (pos - start) % marker_len
      pos = state.skipSpaces(pos)

      if (pos < max) {
        continue
      }

      // found!
      auto_closed = true
      break
    }

    const old_parent = state.parentType
    const old_line_max = state.lineMax
    state.parentType = 'container'

    // this will prevent lazy continuations from ever going past our end marker
    state.lineMax = nextLine

    const videoContent = state.src.slice(
      state.bMarks[startLine + 1],
      state.bMarks[nextLine]
    )
    const videoId = videoContent.split('#')[0]
    const widthMatch = videoContent.match(/w(\d+)/)
    const width = parseInt((widthMatch && widthMatch[1]) || '0', 10)
    const heightMatch = videoContent.match(/h(\d+)/)
    const height = parseInt((heightMatch && heightMatch[1]) || '0', 10)
    const paddingTop =
      width && height ? `${((height * 100) / width).toFixed(2)}%` : '56.25%'
    const urlBase = 'https://hcplayer.moyincloud.com'

    token = state.push(`${name}_open`, 'div', 1)
    token.markup = markup
    token.block = true
    token.info = params
    token.map = [startLine, nextLine]
    token.attrSet('class', 'iframe-container')
    token.attrSet('style', `padding-top: ${paddingTop}`)

    token = state.push(`${name}_iframe_open`, 'iframe', 1)
    token.attrSet('frameborder', '0')
    token.attrSet('allowfullscreen', 'true')
    token.attrSet('scrolling', 'no')
    token.attrSet('src', `${urlBase}/?vid=${videoId}`)

    token = state.push(`${name}_iframe_close`, 'iframe', -1)

    token = state.push(`${name}_close`, 'div', -1)
    token.markup = state.src.slice(start, pos)
    token.block = true

    state.parentType = old_parent
    state.lineMax = old_line_max
    state.line = nextLine + (auto_closed ? 1 : 0)

    return true
  }

  md.block.ruler.before('fence', `${name}`, container, {
    alt: ['paragraph', 'reference', 'blockquote', 'list']
  })
  md.renderer.rules[`${name}_open`] = render
  md.renderer.rules[`${name}_close`] = render
}
