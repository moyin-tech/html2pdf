import MarkdownIt from 'markdown-it'

export const imagePlugin = (md: MarkdownIt) => {
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const url = token.attrGet('src')
    if (url && url.indexOf('#w') !== -1) {
      const parts = url.split('#w')
      if (parts[1] && /^(\d+)(\.\d+)?px$/.test(parts[1])) {
        token.attrSet('width', parts[1].match(/(\d+)/)![0])
      }
    }
    if (url && !url.startsWith('https://') && !url.startsWith('http://')) {
      token.attrSet('src', 'https://' + url)
    }
    return self.renderToken(tokens, idx, options)
  }
}
