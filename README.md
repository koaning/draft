# Draft

An experimental, GitHub-style markdown editor with AI assistance, drag-and-drop image uploads, and live preview. Meant to make barrier of entry for creating blog posts *very* low. 


## 🚀 Quick Start

### Installation

```bash
uv pip install draft
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

