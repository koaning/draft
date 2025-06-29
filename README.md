# Draft

A modern, GitHub-style markdown editor with AI assistance, drag-and-drop image uploads, and live preview. Perfect for creating blog posts, documentation, and any markdown content with an exceptional writing experience.

## ✨ Features

### 🎯 **Core Editing**
- **Split-pane interface** with live markdown preview
- **GitHub-style experience** with familiar keyboard shortcuts
- **AI-powered text enhancement** using custom prompts
- **Smart undo system** (Cmd+Z) with memory-efficient history

### 🖼️ **Image Management**
- **Drag & drop image uploads** with automatic processing
- **UUID-based filenames** to prevent conflicts
- **Automatic figure generation** with caption placeholders
- **Relative paths** for blog system compatibility

### 🔗 **Smart Link Creation**
- **Select text + paste URL** = instant markdown links
- **URL detection** with automatic link formatting
- **Visual link preview** in the live preview pane

### 💾 **File Organization**
- **Document-specific folders** with sanitized names
- **Frontmatter generation** with title and timestamps
- **Always saves as `index.md`** for static site generators
- **Blog-ready structure** for Hugo, Gatsby, Jekyll, etc.

### 🤖 **AI Integration**
- **Custom system prompts** via markdown files
- **Context-aware suggestions** using surrounding text
- **Text generation and editing** modes
- **Retry functionality** with attempt tracking

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- [uv](https://github.com/astral-sh/uv) (recommended) or pip

### Installation

```bash
# Using uv (recommended)
uv add draft

# Or using pip
pip install draft
```

### Setup API Keys

```bash
# For OpenAI (recommended)
export OPENAI_API_KEY="your-key-here"

# Or install other LLM providers
uv run llm install llm-claude-3
```

### Launch the Editor

```bash
# Basic usage
draft serve --write-folder ./my-documents

# With custom system prompt
draft serve --write-folder ./blog-posts --system-prompt ./prompts/blog-writer.md

# Advanced options
draft serve \
  --write-folder ./content \
  --system-prompt ./prompts/technical-writer.md \
  --host 0.0.0.0 \
  --port 8080 \
  --debug
```

## 📖 Usage Guide

### Basic Workflow

1. **📝 Write**: Start typing in the left editor pane
2. **👀 Preview**: See live markdown rendering on the right
3. **🖼️ Add Images**: Drag and drop images directly into the editor
4. **🤖 Enhance Text**: Select text and press `Cmd+Enter` for AI improvements
5. **🔗 Create Links**: Select text and paste URLs for automatic link creation
6. **💾 Save**: Press `Cmd+S` or click the "Render" button to save

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Enter` | Open AI command palette |
| `Cmd+S` | Save document |
| `Cmd+Z` | Undo last action |
| `Enter` | Accept AI suggestion |
| `X` | Retry AI suggestion |
| `Esc` | Cancel/close modals |

### AI Commands

After selecting text and pressing `Cmd+Enter`, try prompts like:
- "Make this more formal"
- "Fix grammar and spelling"
- "Simplify for a general audience"
- "Translate to Spanish"
- "Add more detail and examples"
- "Convert to bullet points"

### Image Workflow

1. **Drag image** into the editor
2. **Enter caption** in the auto-selected placeholder
3. **Images auto-saved** to document folder with UUID names
4. **Relative paths** ensure portability across systems

## 📁 File Structure

Draft creates a clean, blog-ready structure:

```
my-documents/
├── my-first-post/
│   ├── index.md           # Main content with frontmatter
│   ├── hero-image.png     # Uploaded images
│   └── diagram.jpg
├── another-article/
│   ├── index.md
│   └── screenshot.png
└── documentation/
    ├── index.md
    ├── architecture.png
    └── flowchart.svg
```

### Frontmatter Format

```markdown
---
title: "My Blog Post"
date: "2024-01-15T10:30:00Z"
---

# Your content here

<figure>
    <img src="hero-image.png" alt="Uploaded image" />
    <figcaption>Your image caption</figcaption>
</figure>
```

## ⚙️ Configuration

### System Prompts

Create custom AI behavior with markdown files:

```markdown
# Technical Writing Assistant

You are an expert technical writer specializing in developer documentation.

## Guidelines
- Use clear, concise language
- Include code examples when relevant
- Structure content with proper headings
- Focus on practical, actionable information

## Style
- Write in active voice
- Use simple present tense
- Avoid jargon unless necessary
- Include helpful examples
```

### CLI Options

```bash
draft serve --help
```

| Option | Description | Default |
|--------|-------------|---------|
| `--write-folder` | Directory for documents (required) | - |
| `--system-prompt` | Path to system prompt markdown file | None |
| `--host` | Server host address | 127.0.0.1 |
| `--port` | Server port | 5000 |
| `--debug` | Enable debug mode | False |

## 🛠️ Development

### Local Setup

```bash
# Clone the repository
git clone https://github.com/example/draft.git
cd draft

# Install dependencies
uv sync

# Run in development mode
uv run app.py serve --write-folder ./test-docs --debug
```

### Project Structure

```
draft/
├── app.py              # Main Flask application
├── app.js              # Frontend JavaScript
├── index.html          # Web interface
├── pyproject.toml      # Project configuration
├── README.md           # This file
└── system-prompt.md    # Example system prompt
```

## 🤝 LLM Providers

Draft uses [Simon Willison's LLM library](https://llm.datasette.io/), supporting many providers:

### OpenAI (Default)
```bash
export OPENAI_API_KEY="your-key"
```

### Anthropic Claude
```bash
uv run llm install llm-claude-3
export ANTHROPIC_API_KEY="your-key"
```

### Local Models
```bash
uv run llm install llm-gpt4all
```

### List Available Models
```bash
uv run llm models
```

## 📝 Use Cases

### 📚 **Blog Writing**
- Clean markdown output ready for static site generators
- Image management with relative paths
- SEO-friendly frontmatter generation

### 📖 **Documentation**
- Technical writing with AI assistance
- Drag-and-drop diagrams and screenshots
- Consistent formatting and structure

### ✍️ **Content Creation**
- AI-powered text enhancement
- Grammar and style improvements
- Multi-language support

### 🎓 **Academic Writing**
- Research paper drafting
- Citation and reference management
- Figure and caption handling

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Flask](https://flask.palletsprojects.com/) and [Typer](https://typer.tiangolo.com/)
- AI integration via [LLM](https://llm.datasette.io/) by Simon Willison
- Markdown parsing with [Marked.js](https://marked.js.org/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Generated with assistance from [Claude Code](https://claude.ai/code)

---

**Happy writing!** 🎉