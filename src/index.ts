import fs from 'fs';
import minimist, { ParsedArgs } from 'minimist';
import convertHTMLToPDF from 'pdf-puppeteer';
import { createMarkdownRenderer } from './markdown';

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
  console.log(finalHtml)
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
  const fileName = getFileName(filePath)
  let fileContent = fs.readFileSync(filePath).toString()
  if (filePath.endsWith('.md')) {
    const renderer = createMarkdownRenderer('.', {}, '/')
    fileContent = renderer.render(fileContent)
  }
  return '<html>' + headTag + '<body>' + '<div class="title">' + fileName + '</div>' + handleIframeContent(fileContent) + '</body>' + cssStyleTag + '</html>'
}

const getFileName = (filePath: string) => {
  let tmpPath = filePath
  const lastSlashIndex = tmpPath.lastIndexOf('/')
  if (lastSlashIndex !== -1) {
    tmpPath = tmpPath.substring(lastSlashIndex + 1)
  }
  const lastDotIndex = tmpPath.lastIndexOf('.')
  if (lastDotIndex !== -1) {
    tmpPath = tmpPath.substring(0, lastDotIndex)
  }
  return tmpPath
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
* {
  font-family: 'PingFang SC';
}

.title {
  margin-top: 0;
  margin-bottom: 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.5;
  color: #0e1421;
}

h1 {
  margin: 24px 0 0 0;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.25;
  color: #262626;
}

h2 {
  margin: 24px 0 0 0;
  font-size: 24px;
  font-weight: bold;
  line-height: 1.25;
  color: #262626;
}

h3 {
  margin: 24px 0 0 0;
  font-size: 20px;
  font-weight: bold;
  line-height: 1.25;
  color: #262626;
}

h4,
h5,
h6 {
  margin: 24px 0 0 0;
  font-size: 18px;
  font-weight: bold;
  line-height: 1.25;
  color: #262626;
}

p {
  margin: 16px 0 0 0;
  font-size: 16px;
  font-weight: normal;
  line-height: 2;
  color: #333;
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

[class*=language-]>button.copy {
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

[class*=language-]:hover>button.copy,
[class*=language-]>button.copy:focus {
  opacity: 1;
}

[class*=language-]>button.copy.copied,
[class*=language-]>button.copy:hover.copied {
  border-radius: 0 4px 4px 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' height='20' width='20' stroke='rgba(128,128,128,1)' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4'/%3E%3C/svg%3E");
}

[class*=language-]>button.copy.copied::before,
[class*=language-]>button.copy:hover.copied::before {
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

[class*=language-]>span.lang {
  position: absolute;
  top: 6px;
  right: 12px;
  z-index: 2;
  font-size: 12px;
  font-weight: 500;
  color: rgba(235, 235, 235, 0.38);
  transition: color 0.4s, opacity 0.4s;
}

[class*=language-]:hover>button.copy+span.lang,
[class*=language-]>button.copy:focus+span.lang {
  opacity: 0;
}

div[class*=language-].line-numbers-mode {
  padding-left: 32px;
}

div[class*=language-].line-numbers-mode pre {
  padding-left: 16px;
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
  padding: 16px 0;
  background: transparent;
  overflow-x: auto;
  line-height: 24px;
  text-align: left;
  white-space: pre;
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
  line-height: 24px;
  font-size: 16px;
  color: rgba(235, 235, 235, 0.38);
  transition: border-color 0.5s, color 0.5s;
}

code {
  line-height: 23px;
  font-family: source-code-pro, Menlo, Monaco, Consolas, Courier New, monospace;
}

p code,
li>code,
h1>code,
h2>code,
h3>code,
h4>code,
h5>code,
h6>code,
td>code,
th>code {
  color: #262626;
  background-color: #EFF0F0;
  line-height: 24px;
  display: inline-block;
  padding: 0 4px;
  border-radius: 2px;
  font-family: source-code-pro, Menlo, Monaco, Consolas, Courier New, monospace;
}

p span {
  font-size: 16px !important;
}

hr {
  border-top-color: #DFE1E7;
  margin-top: 30px;
  margin-bottom: 30px;
}

table {
  margin-top: 16px;
  border: 1px solid #dfe2e5;
  border-collapse: collapse;
  font-size: 16px;
  min-width: 100%;
}

table th {
  border: 1px solid #dfe2e5;
  text-align: left;
  padding: 10px;
  background-color: rgba(var(--theme_main_color_rgb), 0.1);
  height: 44px;
  box-sizing: border-box;
  word-break: normal;
}

table tbody tr {
  background: white;
}

table tbody tr:nth-child(2n) {
  background-color: rgba(245, 245, 245, 0.6);
}

table td {
  border: 1px solid #dfe2e5;
  padding: 10px;
  height: 44px;
  box-sizing: border-box;
  word-break: normal;
}

table td div[class*=language-] {
  margin-top: -16px;
}

table td [class*=language-] code br {
  display: none;
}

table td div[class*=language-].line-numbers-mode pre+br {
  display: none;
}

table td ul:first-child {
  margin-top: 0;
}

ul {
  padding: 0;
  margin: 16px 0 0 19px;
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
  line-height: 2;
  color: #333;
  user-select: text;
}

li input {
  position: relative;
  top: 2px;
}

ul ul,
ul ol,
ol ul,
ol ol {
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

ol>li::before {
  content: "";
}

ol {
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

blockquote> :last-child {
  margin-bottom: 0;
}

blockquote> :first-child {
  margin-top: 0;
}

.iframe-container-box {
  max-width: 100%;
}

.iframe-container-box .iframe-container {
  margin: 16px 0 0 0;
  overflow: hidden;
  position: relative;
  padding-top: 56.25%;
}

.iframe-container-box .iframe-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.custom-block {
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 10px;
  line-height: 24px;
  font-size: 14px;
  margin-top: 16px;
}

.custom-block p {
  margin-top: 0;
}

.custom-block h1,
.custom-block h2,
.custom-block h3,
.custom-block h4,
.custom-block h5,
.custom-block h6 {
  margin-top: 6px;
}

.custom-block ol,
.custom-block ul {
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

img {
  margin: 16px 0 0 0;
  max-width: 100%;
  height: auto;
  border: 1px solid rgba(223, 225, 231, 0.5);
  border-radius: 4px;
  cursor: zoom-in;
}

pre {
  margin: 16px 0 0 0;
  border-radius: 3px;
  user-select: text;
  overflow-x: auto;
}

a {
  color: var(--theme_link_color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

em {
  color: var(--theme_link_color);
  font-style: normal;
}
</style>\n`
