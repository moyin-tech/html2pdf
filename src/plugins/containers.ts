import MarkdownIt from 'markdown-it'
import { RenderRule } from 'markdown-it/lib/renderer'
import Token from 'markdown-it/lib/token'
import container from 'markdown-it-container'

export const containerPlugin = (md: MarkdownIt) => {
  md.use(...createContainer('tips', '', md))
    .use(...createContainer('info', '', md))
    .use(...createContainer('warning', '', md))
    .use(...createContainer('danger', '', md))
    .use(...createContainer('success', '', md))
    .use(...createContainer('color1', '', md))
    .use(...createContainer('color2', '', md))
    .use(...createContainer('color3', '', md))
    .use(...createContainer('color4', '', md))
    .use(...createContainer('color5', '', md))
    // explicitly escape Vue syntax
    .use(container, 'v-pre', {
      render: (tokens: Token[], idx: number) =>
        tokens[idx].nesting === 1 ? '<div v-pre>\n' : '</div>\n'
    })
}

type ContainerArgs = [typeof container, string, { render: RenderRule }]

function createContainer(
  klass: string,
  defaultTitle: string,
  md: MarkdownIt
): ContainerArgs {
  return [
    container,
    klass,
    {
      render(tokens, idx) {
        const token = tokens[idx]
        if (token.nesting === 1) {
          if (klass === 'details') {
            return `<details class="${klass} custom-block">\n`
          }
          return `<custom-block class="${klass} custom-block" custom-block-type="${klass}">\n`
        }
        return klass === 'details' ? '</details>\n' : '</custom-block>\n'
      }
    }
  ]
}
