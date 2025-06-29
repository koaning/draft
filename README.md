# AI-Powered Markdown Writer

A clean, distraction-free markdown editor with AI assistance. Select any text and use natural language prompts to transform it with AI.

## Features

- **Simple Interface**: Full-screen markdown editor with no distractions
- **Custom Prompts**: Use natural language to describe what you want ("make this more formal", "fix grammar", "translate to Spanish")
- **Keyboard-First**: Cmd+Enter to trigger AI, Enter to accept, Esc to cancel
- **Multiple Models**: Uses Simon Willison's `llm` library - supports OpenAI, Claude, and many others

## Quick Start

1. **Set API Key**:
   ```bash
   export OPENAI_API_KEY=your_key_here
   ```

2. **Start App**:
   ```bash
   uv run app.py
   ```

3. **Open Browser**:
   Go to http://localhost:5000

## Usage

1. **Write**: Type your markdown in the editor
2. **Select**: Highlight the text you want to transform
3. **Command**: Press `Cmd+Enter` (or `Ctrl+Enter`)
4. **Prompt**: Type what you want to do (e.g., "make this more concise")
5. **Review**: See the result and choose to Accept, Try Again, or Edit Prompt

## Example Prompts

- "Make this more formal"
- "Fix grammar and spelling"
- "Simplify for a general audience"
- "Translate to Spanish"
- "Add more detail and examples"
- "Convert to bullet points"
- "Make it sound more confident"

## API Endpoints

- `POST /api/process` - Process text with AI
- `GET /api/health` - Health check
- `GET /api/models` - List available models

## Using Different Models

The app uses Simon Willison's `llm` library, which supports many models:

```bash
# Install Claude
uv run llm install llm-claude-3

# Install other models
uv run llm install llm-gpt4all

# List available models
uv run llm models

# Configure model in app.py
model = llm.get_model("claude-3-sonnet")
```

## Development

- Frontend: Vanilla JavaScript + Tailwind CSS
- Backend: Flask + `llm` library
- No build process required