import MarkdownIt from 'markdown-it'
import { parseHeader } from './utils/parseHeader'
import { highlight } from './plugins/highlight'
import { slugify } from './plugins/slugify'
import { highlightLinePlugin } from './plugins/highlightLines'
import { lineNumberPlugin } from './plugins/lineNumbers'
import { componentPlugin } from './plugins/component'
import { containerPlugin } from './plugins/containers'
import { snippetPlugin } from './plugins/snippet'
import { hoistPlugin } from './plugins/hoist'
import { preWrapperPlugin } from './plugins/preWrapper'
import { linkPlugin } from './plugins/link'
import { headingPlugin } from './plugins/headings'
import { imagePlugin } from './plugins/image'
import { tablePlugin } from './plugins/table'
import { htmlBlockPlugin } from './plugins/htmlblock'
import { taskListPlugin } from './plugins/taskList'
import { paragraphPlugin } from './plugins/paragraph'
import anchor from 'markdown-it-anchor'
import attrs from 'markdown-it-attrs'
import emoji from 'markdown-it-emoji'
import toc from 'markdown-it-table-of-contents'

interface Header {
  level: number
  title: string
  slug: string
}

export interface MarkdownOptions extends MarkdownIt.Options {
  lineNumbers?: boolean
  config?: (md: MarkdownIt) => void
  anchor?: {
    permalink?: anchor.AnchorOptions['permalink']
  }
  attrs?: {
    leftDelimiter?: string
    rightDelimiter?: string
    allowedAttributes?: string[]
  }
  // https://github.com/Oktavilla/markdown-it-table-of-contents
  toc?: any
  externalLinks?: Record<string, string>
}

export interface MarkdownParsedData {
  hoistedTags?: string[]
  links?: string[]
  headers?: Header[]
}

export interface MarkdownRenderer extends MarkdownIt {
  __path: string
  __relativePath: string
  __data: MarkdownParsedData
}

export type { Header }

export const createMarkdownRenderer = (
  srcDir: string,
  options: MarkdownOptions = {},
  base: string
): MarkdownRenderer => {
  const md = MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
    highlight,
    ...options
  }) as MarkdownRenderer

  // custom plugins
  md.use(componentPlugin)
    .use(highlightLinePlugin)
    .use(preWrapperPlugin)
    .use(snippetPlugin, srcDir)
    .use(hoistPlugin)
    .use(containerPlugin)
    .use(headingPlugin)
    .use(imagePlugin)
    .use(taskListPlugin)
    .use(
      linkPlugin,
      {
        target: '_blank',
        rel: 'noopener noreferrer',
        ...options.externalLinks
      },
      base
    )
    // 3rd party plugins
    .use(attrs, options.attrs)
    .use(anchor, options.anchor)
    .use(toc, {
      slugify,
      includeLevel: [2, 3],
      format: parseHeader,
      ...options.toc
    })
    .use(emoji)
    .use(tablePlugin)
    .use(htmlBlockPlugin)
    .use(paragraphPlugin)
    .use(lineNumberPlugin)

  // apply user config
  if (options.config) {
    options.config(md)
  }

  const originalRender = md.render
  md.render = (...args) => {
    md.__data = {}
    return originalRender.call(md, ...args)
  }

  return md
}
