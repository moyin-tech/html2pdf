# html2pdf

A powerful html to PDF command tool use for production environment.

## ✨ Features

- Using Puppeteer and chrome-headless-shell to convert HTML files to PDF.
- Simple commands and clear documentation.

## 📦 Installation

### Via npm (Recommended)

```bash
npm install -g moyin-html2pdf
```

### Via yarn

```bash
yarn global add moyin-html2pdf
```

## 🚀 Quick Start

After installation, you can use it directly in your terminal:

```bash
html2pdf --help
```

Or, if you have multiple commands configured:

```bash
html2pdf [options] <argument>
h2p [options] <argument>
```

## 📖 Usage

```bash
# Convert a html file to pdf file.
html2pdf --input sample.html --output sample.pdf
# Convert a markdown file to pdf file.
html2pdf --input sample.md --output sample.pdf
# Convert url to pdf file.
html2pdf --url https://www.google.com --output sample.pdf

```

## 🐛 Reporting Issues

If you encounter any problems, please report them via [GitHub Issues](https://github.com/moyin-tech/md2html/issues).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- This CLI tool is developed and used in production by [Dochelp.cn](https://dochelp.cn/), a help center building platform.
- **Enjoy using html2pdf !** Feel free to [contact us](mailto:service@moyincloud.com) if you have any questions.
