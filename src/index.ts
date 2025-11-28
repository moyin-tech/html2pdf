import fs from 'fs';
import minimist, { ParsedArgs } from 'minimist';
import { convertHTMLToPDF } from './utils/convertHTMLToPDF';
import { createMarkdownRenderer } from './markdown';
import prism from 'prismjs';
import loadLanguages from 'prismjs/components/index';

export interface RunArgvs extends Omit<ParsedArgs, '_'> {
  version?: string
  source?: string
}
export interface PackageJson {
	engines: {
		node: string;
	};
	version: string;
}
export function run(opts = {} as Omit<RunArgvs, '_'>) {
  const argvs = minimist<RunArgvs>(process.argv.slice(2), {
    alias: {
      help: 'h',
      version: 'v',
      input: 'i',
      output: 'o',
    },
    default: {
      version: opts.v || opts.version || false,
      help: opts.v || opts.version || false,
      input: opts.i || opts.input || '',
      output: opts.o || opts.output || '',
    }
  })
  if (argvs.h || argvs.help) {
    console.log(`${cliHelp}${exampleHelp}`);
    return;
  }
  if (argvs.v || argvs.version) {
    console.log((require('../package.json') as PackageJson).version)
    return;
  }

  if (!argvs.i && !argvs.input) {
    console.log('Missing Parameter "input".')
    return
  }
  if (!argvs.o && !argvs.output) {
    console.log('Missing Parameter "output".')
    return
  }
  const finalHtml = buildFinalHtml(argvs.input)
  convertHTMLToPDF(finalHtml, (pdf) => {
    fs.writeFileSync(argvs.output, pdf)
    console.log('success')
  }, {
    printBackground: true,
    margin: {
      left: 38.5,
      right: 38.5,
      top: 38.5,
      bottom: 38.5
    },
    width: 792.5,
    height: 1123
  }, { 
    args: ['--no-sandbox']
  } as any, true)
}

const buildFinalHtml = (filePath: string) => {
  let fileContent = fs.readFileSync(filePath).toString()
  if (filePath.endsWith('.md')) {
    const renderer = createMarkdownRenderer('.', {}, '/')
    fileContent = renderer.render(fileContent)
  }
  return '<html>' + headTag + '<body>' + handleContent(handleIframeContent(fileContent)) + '</body>' + cssStyleTag + '</html>'
}

const highlight = (str: string, lang: string) => {
  lang = lang.toLowerCase()
  if (lang === 'vue' || lang === 'html') {
    lang = 'markup'
  }
  if (lang === 'md') {
    lang = 'markdown'
  }
  if (lang === 'ts') {
    lang = 'typescript'
  }
  if (lang === 'py') {
    lang = 'python'
  }
  if (lang === '') {
    return str
  }
  if (!prism.languages[lang]) {
    try {
      loadLanguages(lang)
    } catch (e) {
      console.warn(`Syntax highlight for language "${lang}" is not supported.`)
    }
  }
  if (prism.languages[lang]) {
    return prism.highlight(str, prism.languages[lang], lang)
  } else {
    return str
  }
}

const handleContent = (str: string) => {
  const codeSlice = str.split('<pre><code')
  for (let i = 1; i < codeSlice.length; i++) {
    const codeList = codeSlice[i].split('</code></pre>')
    if (codeList.length > 1) {
      const codeInfo = codeList[0].split('>')
      const language =
        extractAtrribute(codeInfo[0], 'class="language-') || 'plaintext'
      const lineCount = codeInfo[1].split('\n').length
      let lineHtml = '<div class="line-numbers-wrapper">'
      for (let j = 0; j < lineCount; j++) {
        lineHtml += `<span>${j + 1}</span><br />`
      }
      lineHtml += '</div>'
      codeInfo[1] =
        highlight(
          codeInfo[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
          language
        ) + '\n'

      codeList[0] = codeInfo.join('>')
      codeSlice[i - 1] =
        codeSlice[i - 1] +
        `<div class="code-block line-numbers-mode language-${language}">`
      codeSlice[i] = codeList.join(
        `</code></pre>${lineHtml}<button class="copy"></button><span class="lang">${language}</span></div>`
      )
    }
  }
  return codeSlice.join('<pre><code')
}

const handleIframeContent = (str: string) => {
  const iframeSlice = str.split('<iframe ')
  for (let i = 1; i < iframeSlice.length; i++) {
    const iframeList = iframeSlice[i].split('</iframe>')
    if (iframeList.length > 1) {
      const iframeInfo = iframeList[0].split('>')
      const srcAttr = extractAtrribute(iframeInfo[0], 'src="')
      iframeSlice[i - 1] = iframeSlice[i - 1] +
        `<p>视频地址：<a href="${srcAttr}" target="_blank">${srcAttr}</a></p>`
      iframeList[0] = ''
      iframeSlice[i] = iframeList.join('')
    }
  }
  return iframeSlice.join('')
}

const extractAtrribute = (attrStr: string, attrName: string) => {
  const startIndex = attrStr.indexOf(attrName)
  if (startIndex !== -1) {
    const endIndex = attrStr.indexOf('"', startIndex + attrName.length)
    if (endIndex !== -1) {
      return attrStr.substring(startIndex + attrName.length, endIndex)
    }
  }
  return ''
}

export const cliHelp: string = `\n  Usage: html2pdf [options] [--help|h]
  Options:\n
    --input, -i            The path of the target file "*.html, *.md". Default: ""
    --output, -o           The path of the target file "*.pdf". Default: ""
    --version, -v           Show version number
    --help, -h              Displays help information.
`;

export const exampleHelp: string =`\n  Example:
    \x1b[35mnpm\x1b[0m html2pdf
    \x1b[35mnpm\x1b[0m h2p
    \x1b[35mnpm\x1b[0m html2pdf \x1b[33m--input\x1b[0m README.html \x1b[33m--output\x1b[0m README.pdf
`;

const headTag: string = `<head>
<meta charset="utf-8">
</head>\n`
const cssStyleTag: string = `\n<style>
:root {
  --theme_main_color: #1F5FFF;
  --theme_main_color_rgb: 31, 95, 255;
  --theme_link_color: #1F5FFF;
  --theme_text_color_on_main: #FFFFFF;
  --theme_table_header_bg: rgba(31, 95, 255, 0.1);
}
.title {
  margin-top: 0;
  margin-bottom: 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.5;
  color: #0e1421;
}
.moyinVideo {
  padding-top: 0 !important;
}
* {
  font-family: 'PingFang SC';
  box-sizing: border-box;
}
iframe {
  display: none;
}
h1, h2, h3, h4, h5, h6 {
  margin: 24px 0 0 0;
  font-weight: bold;
  line-height: 1.4;
  color: #262626;
}
h1 {
  font-size: 28px;
}
h2 {
  font-size: 24px;
}
h3 {
  font-size: 20px;
}
h4 {
  font-size: 18px;
}
h5 {
  font-size: 16px;
}
h6 {
  font-size: 14px;
}

p {
  margin: 16px 0 0;
  font-size: 16px;
  font-weight: normal;
  line-height: 1.75;
  min-height: 28px;
  color: #333;
  white-space: normal;
}
p img.ProseMirror-separator {
  display: none !important;
}
p .ProseMirror-trailingBreak:not(:first-child) {
  height: 0;
  display: none;
}
p img.ProseMirror-separator + .ProseMirror-trailingBreak {
  display: inline;
}
mark {
  color: inherit;
  display: inline-block;
}
div[class*=language-] {
  border-radius: 8px;
  margin: 16px 0;
}
div[class*=language-] {
  position: relative;
  margin: 16px 0;
  background-color: hsl(220, 13%, 18%);
  overflow-x: auto;
  transition: background-color 0.5s;
}
[class*=language-] > button.copy {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  display: block;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
  width: 40px;
  height: 40px;
  background-color: #292d3e;
  opacity: 0;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' height='20' width='20' stroke='rgba(128,128,128,1)' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2'/%3E%3C/svg%3E");
  background-position: 50%;
  background-size: 20px;
  background-repeat: no-repeat;
  transition: opacity 0.4s;
  border: none;
}
[class*=language-]:hover > button.copy,
[class*=language-] > button.copy:focus {
  opacity: 1;
}
[class*=language-] > button.copy.copied,
[class*=language-] > button.copy:hover.copied {
  border-radius: 0 4px 4px 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' height='20' width='20' stroke='rgba(128,128,128,1)' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4'/%3E%3C/svg%3E");
}
[class*=language-] > button.copy.copied::before,
[class*=language-] > button.copy:hover.copied::before {
  position: relative;
  left: -70px;
  top: -1px;
  display: block;
  border-radius: 4px 0 0 4px;
  padding-top: 12px;
  width: 64px;
  height: 28px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  background-color: #292d3e;
  color: rgba(235, 235, 235, 0.6);
  white-space: nowrap;
  content: "Copied";
}
[class*=language-] > span.lang {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 2;
  font-size: 12px;
  font-weight: 500;
  color: rgba(235, 235, 235, 0.38);
  transition: color 0.4s, opacity 0.4s;
}
[class*=language-]:hover > button.copy + span.lang, [class*=language-] > button.copy:focus + span.lang {
  opacity: 0;
}
div[class*=language-].line-numbers-mode {
  padding-left: 32px;
}
div[class*=language-].line-numbers-mode pre {
  padding-left: 16px;
  white-space: pre-wrap;
}
div[class*=language-].line-numbers-mode pre:hover::-webkit-scrollbar-thumb {
  background: #D3D3D3;
  transition: all 0.3s;
  border-radius: 8px;
}
div[class*=language-].line-numbers-mode pre::-webkit-scrollbar {
  height: 8px;
}
[class*=language-] code {
  color: aliceblue;
}
[class*=language-] pre {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 16px;
  background: transparent;
  overflow-x: auto;
  line-height: 1.5;
  text-align: left;
  white-space: pre-wrap;
  word-spacing: normal;
  word-break: normal;
  word-wrap: normal;
  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;
  -webkit-hyphens: none;
  -moz-hyphens: none;
  -ms-hyphens: none;
  hyphens: none;
}
.line-numbers-wrapper {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  border-right: 1px solid rgba(84, 84, 84, 0.4784313725);
  padding-top: 16px;
  width: 32px;
  text-align: center;
  line-height: 1.5;
  font-size: 16px;
  color: rgba(235, 235, 235, 0.38);
  transition: border-color 0.5s, color 0.5s;
}
code {
  line-height: 1.5;
  font-family: source-code-pro, Menlo, Monaco, Consolas, Courier New, monospace;
}
p code, li > code, h1 > code, h2 > code, h3 > code, h4 > code, h5 > code, h6 > code, td > code, th > code {
  color: #262626;
  background-color: #EFF0F0;
  line-height: 1.5;
  display: inline-block;
  padding: 0 4px;
  border-radius: 2px;
  font-family: source-code-pro, Menlo, Monaco, Consolas, Courier New, monospace;
}
p span {
  font-size: 16px;
}
hr {
  border-top-color: #DFE1E7;
  margin-top: 30px;
  margin-bottom: 30px;
}
table {
  margin: 16px 0 0 0;
  border: 1px solid #dfe2e5;
  border-collapse: collapse;
  font-size: 16px;
  table-layout: fixed;
  overflow: hidden;
}
table tbody tr {
  background: white;
}
table tbody tr:nth-child(2n+1) {
  background: white;
}
table tbody tr:nth-child(2n+1) > * {
  background-color: rgba(245, 245, 245, 0.6);
}
table tbody tr:nth-child(2n+1) > th {
  background-color: rgba(var(--theme_main_color_rgb), 0.1);
}
table tbody tr th {
  text-align: left;
  background-color: rgba(var(--theme_main_color_rgb), 0.1);
}
table td, table th {
  border: 1px solid #dfe2e5;
  padding: 10px 16px;
  height: 44px;
  min-width: 60px;
  box-sizing: border-box;
  word-break: normal;
  overflow-wrap: anywhere;
  position: relative;
}
table td.selectedCell, table th.selectedCell {
  background-color: rgba(var(--theme_main_color_rgb), 0.4) !important;
}
table td > *, table th > * {
  margin-top: 6px;
}
table td > *:first-child, table th > *:first-child {
  margin-top: 0;
}
table td > *:last-child, table th > *:last-child {
  margin-bottom: 0;
}
table td div[class*=language-] {
  margin-top: -16px;
}
table td [class*=language-] code br {
  display: none;
}
table td div[class*=language-].line-numbers-mode pre + br {
  display: none;
}
.tableWrapper {
  margin: 16px 0 0 0;
  position: relative;
}
.tableWrapper table {
  margin-top: 0;
}
img {
  display: inline-block;
  float: none;
  margin: 0;
  max-width: 100%;
  height: auto;
  cursor: zoom-in;
}
img[data-display=inline] {
  margin-left: 12px;
  margin-right: 12px;
  max-width: calc(100% - 24px);
}
img[data-display=block] {
  display: block;
}
img[data-display=left] {
  float: left;
  margin-left: 0;
  margin-right: 12px;
  max-width: calc(100% - 12px);
}
img[data-display=right] {
  float: right;
  margin-left: 12px;
  margin-right: 0;
  max-width: calc(100% - 12px);
}
.image-view {
  display: inline-block;
  float: none;
  line-height: 0;
  margin: 0;
  max-width: 100%;
  user-select: none;
  vertical-align: baseline;
}
.image-view--inline {
  margin-left: 12px;
  margin-right: 12px;
}
.image-view--block {
  display: block;
}
.image-view--left {
  float: left;
  margin-left: 0;
  margin-right: 12px;
}
.image-view--right {
  float: right;
  margin-left: 12px;
  margin-right: 0;
}
.image-view__body-editable:hover {
  outline-color: #ffc83d;
}
.image-view__body-editable .image-view__body__image {
  cursor: pointer;
}
.image-view__body {
  clear: both;
  display: inline-block;
  max-width: 100%;
  outline-color: transparent;
  outline-style: solid;
  outline-width: 2px;
  transition: all 0.2s ease-in;
  position: relative;
}
.image-view__body--focused:hover, .image-view__body--resizing:hover {
  outline-color: transparent;
}
.image-view__body__placeholder {
  height: 100%;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: -1;
}
.image-view__body__image {
  cursor: default;
  margin: 0;
  min-width: 16px;
  min-height: 16px;
}
.image-resizer {
  border: 1px solid var(--theme_main_color);
  height: 100%;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 1;
}
.image-resizer__handler {
  background-color: var(--theme_main_color);
  border: 1px solid #fff;
  border-radius: 2px;
  box-sizing: border-box;
  display: block;
  height: 12px;
  position: absolute;
  width: 12px;
  z-index: 2;
}
.image-resizer__handler--tl {
  cursor: nw-resize;
  left: -6px;
  top: -6px;
}
.image-resizer__handler--tr {
  cursor: ne-resize;
  right: -6px;
  top: -6px;
}
.image-resizer__handler--bl {
  bottom: -6px;
  cursor: sw-resize;
  left: -6px;
}
.image-resizer__handler--br {
  bottom: -6px;
  cursor: se-resize;
  right: -6px;
}
.resize-cursor {
  cursor: ew-resize;
  cursor: col-resize;
}
.column-resize-handle {
  background-color: var(--theme_main_color);
  bottom: 0;
  pointer-events: none;
  position: absolute;
  right: -1px;
  top: 0;
  width: 2px;
  z-index: 20;
}
ul[data-type=taskList] {
  margin-left: 5px;
}
ul[data-type=taskList] .task-item-wrapper {
  display: flex;
}
ul[data-type=taskList] li[data-type=taskItem] {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  margin-bottom: 0;
  width: 100%;
}
ul[data-type=taskList] li[data-type=taskItem][data-text-align=right] {
  justify-content: flex-end !important;
}
ul[data-type=taskList] li[data-type=taskItem][data-text-align=center] {
  justify-content: center !important;
}
ul[data-type=taskList] li[data-type=taskItem][data-text-align=justify] {
  justify-content: space-between !important;
}
ul[data-type=taskList] li[data-type=taskItem] .todo-content {
  padding-left: 10px;
  width: 100%;
}
ul[data-type=taskList] li[data-type=taskItem] .todo-content > p {
  font-size: 16px;
}
ul[data-type=taskList] li[data-type=taskItem] .todo-content > p:last-of-type {
  margin-bottom: 0;
}
ul[data-type=taskList] li[data-type=taskItem][data-done=done] > .todo-content > p {
  color: var(--theme_main_color);
  text-decoration: line-through;
}
ul[data-type=taskList] li[data-type=taskItem] .task-height {
  height: 28px;
}
ul {
  padding: 0;
  margin: 16px 0 0px 19px;
  user-select: text;
}
ul.contains-task-list {
  list-style: none;
  margin-left: 0;
}
ol {
  padding: 0;
  margin: 16px 0 0 19px;
  user-select: text;
}
li {
  font-size: 16px;
  font-weight: normal;
  line-height: 1.75;
  color: #333;
  user-select: text;
}
li input {
  position: relative;
  top: 2px;
}
li p {
  margin: 0;
  color: #333;
}
ul ul, ul ol, ol ul, ol ol {
  margin-top: 0;
  margin-bottom: 0;
}
ul {
  list-style-type: disc;
}
ul ul {
  list-style-type: circle;
}
ul ul ul {
  list-style-type: square;
}
ol {
  list-style-type: decimal;
}
ol li {
  list-style-type: decimal;
}
ol ol {
  list-style-type: lower-roman;
}
ol ol ol {
  list-style-type: lower-alpha;
}
blockquote {
  margin: 16px 0 0px 0;
  padding: 10px 20px;
  background: rgba(var(--theme_main_color_rgb), 0.1);
  border-left: 4px solid var(--theme_main_color);
}
blockquote p {
  margin: 0;
  color: #333;
}
blockquote > :last-child {
  margin-bottom: 0;
}
blockquote > :first-child {
  margin-top: 0;
}
.iframe-container-box {
  max-width: 100%;
  border: 1px solid transparent;
  margin-top: 16px;
}
.iframe-container-box .iframe-container {
  margin: 0 0 0 0;
  overflow: hidden;
  position: relative;
  padding-top: 56.25%;
}
.iframe-container-box .iframe-container-focused {
  border: 1px solid var(--theme_main_color);
}
.iframe-container-box .iframe-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.iframe-container-focused {
  border: 1px solid var(--theme_main_color);
  margin-top: 16px;
}
.iframe-container-focused .iframe-container {
  margin-top: 0 !important;
}
custom-block {
  display: block;
}
.custom-block {
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 10px;
  line-height: 1.75;
  font-size: 14px;
  margin-top: 16px;
}
.custom-block > * {
  margin-top: 6px;
}
.custom-block > *:last-child {
  margin-bottom: 0;
}
.custom-block > *:first-child {
  margin-top: 0;
}
.tips {
  background-color: rgba(244, 245, 245, 0.5);
  border: 1px solid transparent;
}
.info {
  background-color: rgba(217, 232, 252, 0.5);
  border: 1px solid transparent;
}
.warning {
  background-color: rgba(249, 239, 205, 0.5);
  border: 1px solid transparent;
}
.success {
  background-color: rgba(232, 247, 207, 0.5);
  border: 1px solid transparent;
}
.danger {
  background-color: rgba(251, 228, 231, 0.5);
  border: 1px solid transparent;
}
.color1 {
  background-color: rgba(206, 241, 247, 0.5);
  border: 1px solid transparent;
}
.color2 {
  background-color: rgba(218, 246, 234, 0.5);
  border: 1px solid transparent;
}
.color3 {
  background-color: rgba(253, 230, 211, 0.5);
  border: 1px solid transparent;
}
.color4 {
  background-color: rgba(251, 223, 239, 0.5);
  border: 1px solid transparent;
}
.color5 {
  background-color: rgba(230, 220, 249, 0.5);
  border: 1px solid transparent;
}
.table-box {
  overflow-x: auto;
  padding-bottom: 10px;
}
a {
  color: var(--theme_link_color);
  text-decoration: none !important;
}
a:hover {
  text-decoration: underline;
}
.conflict-block {
  display: block;
  border: 1px solid transparent;
  border-radius: 8px 0 8px 8px;
  padding: 10px;
  line-height: 24px;
  font-size: 14px;
  margin-top: 26px;
  background-color: rgba(252, 76, 23, 0.5);
  position: relative;
}
.conflict-block .operate-btn-line {
  position: absolute;
  top: -26px;
  right: -1px;
}
.conflict-block .operate-btn-line button {
  background-color: rgba(252, 76, 23, 0.5);
  color: #fff;
  border: none;
  height: 25px;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
}
.conflict-block > * {
  margin-top: 6px;
}
.conflict-block > *:first-child {
  margin-top: 0;
}
.conflict-block > *:last-child {
  margin-bottom: 6px;
}
.file-block {
  margin: 16px 0 0 0;
  height: 60px;
  border: 1px solid #dee0e3;
  box-sizing: border-box;
  border-radius: 8px;
  padding: 8px 12px;
  max-width: 400px;
  display: flex;
  flex-direction: row;
  align-items: center;
}
.file-block:hover {
  border: 1px solid rgba(var(--theme_main_color_rgb), 0.6);
}
.file-block * {
  pointer-events: none;
}
.file-block .file-icon {
  width: 36px;
  height: 36px;
}
.file-block .file-info {
  margin-left: 8px;
  display: flex;
  flex-direction: column;
  width: 0;
  flex-grow: 1;
}
.file-block .file-info .file-name {
  color: rgb(31, 35, 41);
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 19px;
}
.file-block .file-info .file-size {
  margin-top: 4px;
  color: rgb(100, 106, 115);
  font-size: 12px;
  line-height: 14px;
}
.el-checkbox {
	display: inline-flex;
	align-items: center;
}
.el-checkbox__input {
	display: inline-flex;
}
.el-checkbox__inner {
  display: inline-block;
  border: 1px solid rgb(220, 223, 230);
  width: 14px;
  height: 14px;
  border-radius: 2px;
}
</style>
<style>
code[class*="language-"],
pre[class*="language-"] {
	background: hsl(220, 13%, 18%);
	color: hsl(220, 14%, 71%);
	text-shadow: 0 1px rgba(0, 0, 0, 0.3);
	font-family: "Fira Code", "Fira Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace;
	direction: ltr;
	text-align: left;
	white-space: pre-wrap;
	word-spacing: normal;
	word-break: normal;
	line-height: 1.5;
	-moz-tab-size: 2;
	-o-tab-size: 2;
	tab-size: 2;
	-webkit-hyphens: none;
	-moz-hyphens: none;
	-ms-hyphens: none;
	hyphens: none;
}

/* Selection */
code[class*="language-"]::-moz-selection,
code[class*="language-"] *::-moz-selection,
pre[class*="language-"] *::-moz-selection {
	background: hsl(220, 13%, 28%);
	color: inherit;
	text-shadow: none;
}

code[class*="language-"]::selection,
code[class*="language-"] *::selection,
pre[class*="language-"] *::selection {
	background: hsl(220, 13%, 28%);
	color: inherit;
	text-shadow: none;
}

/* Code blocks */
pre[class*="language-"] {
	padding: 1em;
	margin: 0.5em 0;
	overflow: auto;
	border-radius: 0.3em;
}

/* Inline code */
:not(pre) > code[class*="language-"] {
	padding: 0.2em 0.3em;
	border-radius: 0.3em;
	white-space: normal;
}

/* Print */
@media print {
	code[class*="language-"],
	pre[class*="language-"] {
		text-shadow: none;
	}
}

.token.comment,
.token.prolog,
.token.cdata {
	color: hsl(220, 10%, 40%);
}

.token.doctype,
.token.punctuation,
.token.entity {
	color: hsl(220, 14%, 71%);
}

.token.attr-name,
.token.class-name,
.token.boolean,
.token.constant,
.token.number,
.token.atrule {
	color: hsl(29, 54%, 61%);
}

.token.keyword {
	color: hsl(286, 60%, 67%);
}

.token.property,
.token.tag,
.token.symbol,
.token.deleted,
.token.important {
	color: hsl(355, 65%, 65%);
}

.token.selector,
.token.string,
.token.char,
.token.builtin,
.token.inserted,
.token.regex,
.token.attr-value,
.token.attr-value > .token.punctuation {
	color: hsl(95, 38%, 62%);
}

.token.variable,
.token.operator,
.token.function {
	color: hsl(207, 82%, 66%);
}

.token.url {
	color: hsl(187, 47%, 55%);
}

/* HTML overrides */
.token.attr-value > .token.punctuation.attr-equals,
.token.special-attr > .token.attr-value > .token.value.css {
	color: hsl(220, 14%, 71%);
}

/* CSS overrides */
.language-css .token.selector {
	color: hsl(355, 65%, 65%);
}

.language-css .token.property {
	color: hsl(220, 14%, 71%);
}

.language-css .token.function,
.language-css .token.url > .token.function {
	color: hsl(187, 47%, 55%);
}

.language-css .token.url > .token.string.url {
	color: hsl(95, 38%, 62%);
}

.language-css .token.important,
.language-css .token.atrule .token.rule {
	color: hsl(286, 60%, 67%);
}

/* JS overrides */
.language-javascript .token.operator {
	color: hsl(286, 60%, 67%);
}

.language-javascript .token.template-string > .token.interpolation > .token.interpolation-punctuation.punctuation {
	color: hsl(5, 48%, 51%);
}

/* JSON overrides */
.language-json .token.operator {
	color: hsl(220, 14%, 71%);
}

.language-json .token.null.keyword {
	color: hsl(29, 54%, 61%);
}

/* MD overrides */
.language-markdown .token.url,
.language-markdown .token.url > .token.operator,
.language-markdown .token.url-reference.url > .token.string {
	color: hsl(220, 14%, 71%);
}

.language-markdown .token.url > .token.content {
	color: hsl(207, 82%, 66%);
}

.language-markdown .token.url > .token.url,
.language-markdown .token.url-reference.url {
	color: hsl(187, 47%, 55%);
}

.language-markdown .token.blockquote.punctuation,
.language-markdown .token.hr.punctuation {
	color: hsl(220, 10%, 40%);
	font-style: italic;
}

.language-markdown .token.code-snippet {
	color: hsl(95, 38%, 62%);
}

.language-markdown .token.bold .token.content {
	color: hsl(29, 54%, 61%);
}

.language-markdown .token.italic .token.content {
	color: hsl(286, 60%, 67%);
}

.language-markdown .token.strike .token.content,
.language-markdown .token.strike .token.punctuation,
.language-markdown .token.list.punctuation,
.language-markdown .token.title.important > .token.punctuation {
	color: hsl(355, 65%, 65%);
}

/* General */
.token.bold {
	font-weight: bold;
}

.token.comment,
.token.italic {
	font-style: italic;
}

.token.entity {
	cursor: help;
}

.token.namespace {
	opacity: 0.8;
}

/* Plugin overrides */
/* Selectors should have higher specificity than those in the plugins' default stylesheets */

/* Show Invisibles plugin overrides */
.token.token.tab:not(:empty):before,
.token.token.cr:before,
.token.token.lf:before,
.token.token.space:before {
	color: hsla(220, 14%, 71%, 0.15);
	text-shadow: none;
}

/* Toolbar plugin overrides */
/* Space out all buttons and move them away from the right edge of the code block */
div.code-toolbar > .toolbar.toolbar > .toolbar-item {
	margin-right: 0.4em;
}

/* Styling the buttons */
div.code-toolbar > .toolbar.toolbar > .toolbar-item > button,
div.code-toolbar > .toolbar.toolbar > .toolbar-item > a,
div.code-toolbar > .toolbar.toolbar > .toolbar-item > span {
	background: hsl(220, 13%, 26%);
	color: hsl(220, 9%, 55%);
	padding: 0.1em 0.4em;
	border-radius: 0.3em;
}

div.code-toolbar > .toolbar.toolbar > .toolbar-item > button:hover,
div.code-toolbar > .toolbar.toolbar > .toolbar-item > button:focus,
div.code-toolbar > .toolbar.toolbar > .toolbar-item > a:hover,
div.code-toolbar > .toolbar.toolbar > .toolbar-item > a:focus,
div.code-toolbar > .toolbar.toolbar > .toolbar-item > span:hover,
div.code-toolbar > .toolbar.toolbar > .toolbar-item > span:focus {
	background: hsl(220, 13%, 28%);
	color: hsl(220, 14%, 71%);
}

/* Line Highlight plugin overrides */
/* The highlighted line itself */
.line-highlight.line-highlight {
	background: hsla(220, 100%, 80%, 0.04);
}

/* Default line numbers in Line Highlight plugin */
.line-highlight.line-highlight:before,
.line-highlight.line-highlight[data-end]:after {
	background: hsl(220, 13%, 26%);
	color: hsl(220, 14%, 71%);
	padding: 0.1em 0.6em;
	border-radius: 0.3em;
	box-shadow: 0 2px 0 0 rgba(0, 0, 0, 0.2); /* same as Toolbar plugin default */
}

/* Hovering over a linkable line number (in the gutter area) */
/* Requires Line Numbers plugin as well */
pre[id].linkable-line-numbers.linkable-line-numbers span.line-numbers-rows > span:hover:before {
	background-color: hsla(220, 100%, 80%, 0.04);
}

/* Line Numbers and Command Line plugins overrides */
/* Line separating gutter from coding area */
.line-numbers.line-numbers .line-numbers-rows,
.command-line .command-line-prompt {
	border-right-color: hsla(220, 14%, 71%, 0.15);
}

/* Stuff in the gutter */
.line-numbers .line-numbers-rows > span:before,
.command-line .command-line-prompt > span:before {
	color: hsl(220, 14%, 45%);
}

/* Match Braces plugin overrides */
/* Note: Outline colour is inherited from the braces */
.rainbow-braces .token.token.punctuation.brace-level-1,
.rainbow-braces .token.token.punctuation.brace-level-5,
.rainbow-braces .token.token.punctuation.brace-level-9 {
	color: hsl(355, 65%, 65%);
}

.rainbow-braces .token.token.punctuation.brace-level-2,
.rainbow-braces .token.token.punctuation.brace-level-6,
.rainbow-braces .token.token.punctuation.brace-level-10 {
	color: hsl(95, 38%, 62%);
}

.rainbow-braces .token.token.punctuation.brace-level-3,
.rainbow-braces .token.token.punctuation.brace-level-7,
.rainbow-braces .token.token.punctuation.brace-level-11 {
	color: hsl(207, 82%, 66%);
}

.rainbow-braces .token.token.punctuation.brace-level-4,
.rainbow-braces .token.token.punctuation.brace-level-8,
.rainbow-braces .token.token.punctuation.brace-level-12 {
	color: hsl(286, 60%, 67%);
}

/* Diff Highlight plugin overrides */
/* Taken from https://github.com/atom/github/blob/master/styles/variables.less */
pre.diff-highlight > code .token.token.deleted:not(.prefix),
pre > code.diff-highlight .token.token.deleted:not(.prefix) {
	background-color: hsla(353, 100%, 66%, 0.15);
}

pre.diff-highlight > code .token.token.deleted:not(.prefix)::-moz-selection,
pre.diff-highlight > code .token.token.deleted:not(.prefix) *::-moz-selection,
pre > code.diff-highlight .token.token.deleted:not(.prefix)::-moz-selection,
pre > code.diff-highlight .token.token.deleted:not(.prefix) *::-moz-selection {
	background-color: hsla(353, 95%, 66%, 0.25);
}

pre.diff-highlight > code .token.token.deleted:not(.prefix)::selection,
pre.diff-highlight > code .token.token.deleted:not(.prefix) *::selection,
pre > code.diff-highlight .token.token.deleted:not(.prefix)::selection,
pre > code.diff-highlight .token.token.deleted:not(.prefix) *::selection {
	background-color: hsla(353, 95%, 66%, 0.25);
}

pre.diff-highlight > code .token.token.inserted:not(.prefix),
pre > code.diff-highlight .token.token.inserted:not(.prefix) {
	background-color: hsla(137, 100%, 55%, 0.15);
}

pre.diff-highlight > code .token.token.inserted:not(.prefix)::-moz-selection,
pre.diff-highlight > code .token.token.inserted:not(.prefix) *::-moz-selection,
pre > code.diff-highlight .token.token.inserted:not(.prefix)::-moz-selection,
pre > code.diff-highlight .token.token.inserted:not(.prefix) *::-moz-selection {
	background-color: hsla(135, 73%, 55%, 0.25);
}

pre.diff-highlight > code .token.token.inserted:not(.prefix)::selection,
pre.diff-highlight > code .token.token.inserted:not(.prefix) *::selection,
pre > code.diff-highlight .token.token.inserted:not(.prefix)::selection,
pre > code.diff-highlight .token.token.inserted:not(.prefix) *::selection {
	background-color: hsla(135, 73%, 55%, 0.25);
}

/* Previewers plugin overrides */
/* Based on https://github.com/atom-community/atom-ide-datatip/blob/master/styles/atom-ide-datatips.less and https://github.com/atom/atom/blob/master/packages/one-dark-ui */
/* Border around popup */
.prism-previewer.prism-previewer:before,
.prism-previewer-gradient.prism-previewer-gradient div {
	border-color: hsl(224, 13%, 17%);
}

/* Angle and time should remain as circles and are hence not included */
.prism-previewer-color.prism-previewer-color:before,
.prism-previewer-gradient.prism-previewer-gradient div,
.prism-previewer-easing.prism-previewer-easing:before {
	border-radius: 0.3em;
}

/* Triangles pointing to the code */
.prism-previewer.prism-previewer:after {
	border-top-color: hsl(224, 13%, 17%);
}

.prism-previewer-flipped.prism-previewer-flipped.after {
	border-bottom-color: hsl(224, 13%, 17%);
}

/* Background colour within the popup */
.prism-previewer-angle.prism-previewer-angle:before,
.prism-previewer-time.prism-previewer-time:before,
.prism-previewer-easing.prism-previewer-easing {
	background: hsl(219, 13%, 22%);
}

/* For angle, this is the positive area (eg. 90deg will display one quadrant in this colour) */
/* For time, this is the alternate colour */
.prism-previewer-angle.prism-previewer-angle circle,
.prism-previewer-time.prism-previewer-time circle {
	stroke: hsl(220, 14%, 71%);
	stroke-opacity: 1;
}

/* Stroke colours of the handle, direction point, and vector itself */
.prism-previewer-easing.prism-previewer-easing circle,
.prism-previewer-easing.prism-previewer-easing path,
.prism-previewer-easing.prism-previewer-easing line {
	stroke: hsl(220, 14%, 71%);
}

/* Fill colour of the handle */
.prism-previewer-easing.prism-previewer-easing circle {
	fill: transparent;
}
</style>
\n`
