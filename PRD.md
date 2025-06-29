# Product Requirements Document: AI-Powered Markdown Writer

## Overview
A browser-based markdown writing tool that enables writers to select text and apply AI-powered transformations through a command palette interface. The tool focuses on maintaining writing flow while providing powerful AI assistance.

## Core Principles
- **Non-destructive**: Never lose original text
- **Iterative**: Rerun commands until satisfied
- **Contextual**: AI sees surrounding context
- **Keyboard-first**: Minimize mouse usage

## Architecture

### Frontend
- **Technology**: Vanilla JavaScript + Tailwind CSS
- **Files**:
  - `index.html` - Main application
  - `app.js` - Core application logic
- **Key Libraries**: 
  - Tailwind CSS (via CDN)
  - No JS frameworks

### Backend
- **Technology**: Flask (Python)
- **Endpoints**:
  - `POST /api/process` - Process text with AI
  - `GET /api/commands` - Get available commands
  - `GET /api/history` - Get session history

## User Interface

### Layout
- **Single-pane editor**: Full-width markdown editor
- **Floating UI elements**: Command palette and result previews
- **Minimal chrome**: Focus on writing experience

### Interaction Flow
1. User writes markdown in editor
2. User selects text to transform
3. User presses `Cmd/Ctrl + K` to open command palette
4. User selects command (e.g., "Improve Writing")
5. Result appears in modal/popup with options:
   - **Accept**: Replace selected text with smooth animation
   - **Rerun**: Get new variation
   - **Try Another**: Return to command palette
   - **Cancel**: Dismiss and keep original

## Features

### Text Selection
- **Method**: Native browser selection (`window.getSelection()`)
- **Persistence**: Store range before command execution
- **Visual Feedback**: Highlight selected text with yellow background
- **Multi-line**: Support selecting across paragraphs

### Command Palette
- **Activation**: `Cmd/Ctrl + K`
- **Search**: Fuzzy search through commands
- **Navigation**: Arrow keys + Enter
- **Preview**: Show selected text in palette
- **Categories**: Group related commands

### Available Commands

#### Writing Enhancement
- **Improve Writing**: Make clearer and more concise
- **Fix Grammar**: Correct grammar and spelling
- **Simplify**: Use simpler language
- **Expand**: Add more detail and context

#### Tone Adjustment
- **Make Academic**: Formal, scholarly tone
- **Make Casual**: Conversational tone
- **Make Professional**: Business appropriate

#### Structure
- **Summarize**: Create brief summary
- **Bullet Points**: Convert to bulleted list
- **Create Outline**: Generate structured outline
- **Add Examples**: Include relevant examples

#### Creative
- **Continue Writing**: Generate next paragraph
- **Rephrase**: Alternative wording
- **Ask Question**: What would reader ask here?

### Result Preview Modal
- **Floating Modal**: Appears near selected text
- **Comparison View**: Show original vs result
- **Attempt Counter**: "Version 2 of 3"
- **Visual Diff**: Highlight changes
- **Actions**:
  - Accept (with smooth text replacement)
  - Rerun (max 5 attempts)
  - Copy to clipboard
  - Try different command
- **Keyboard Controls**: 
  - `Enter` to accept
  - `R` to rerun
  - `Esc` to cancel

## API Specification

### Process Text Endpoint
```http
POST /api/process
Content-Type: application/json

{
  "text": "The selected text to process",
  "command": "improve",
  "context": {
    "before": "Text before selection (100 chars)",
    "after": "Text after selection (100 chars)"
  },
  "attempt": 1,
  "previousResults": [],
  "options": {
    "temperature": 0.7,
    "style": "concise"
  }
}

Response:
{
  "id": "result_123",
  "original": "The selected text",
  "result": "The improved text",
  "command": "improve",
  "attempt": 1,
  "metadata": {
    "tokens": 45,
    "readability": 8.2,
    "changes": ["clarity", "conciseness"]
  }
}
```

### Commands Endpoint
```http
GET /api/commands

Response:
{
  "commands": [
    {
      "id": "improve",
      "name": "Improve Writing",
      "description": "Make text clearer and more concise",
      "category": "enhancement",
      "shortcuts": ["cmd+i"],
      "requiresSelection": true
    }
  ]
}
```

## UI Design with Tailwind

### Editor Styling
```html
<textarea class="w-full h-screen p-8 text-gray-800 bg-white 
                 font-mono text-base leading-relaxed resize-none 
                 focus:outline-none selection:bg-yellow-200">
</textarea>
```

### Command Palette
```html
<div class="fixed top-1/2 left-1/2 transform -translate-x-1/2 
            -translate-y-1/2 w-full max-w-2xl bg-white rounded-lg 
            shadow-2xl border border-gray-200">
  <!-- Search input -->
  <input class="w-full px-6 py-4 text-lg border-b border-gray-200 
                focus:outline-none">
  <!-- Command list -->
  <div class="max-h-96 overflow-y-auto">
    <div class="px-6 py-3 hover:bg-gray-50 cursor-pointer">
      <!-- Command item -->
    </div>
  </div>
</div>
```

### Result Modal
```html
<div class="fixed z-50 bg-white rounded-lg shadow-xl border 
            border-gray-200 p-6 max-w-lg">
  <!-- Original text -->
  <div class="mb-4 p-3 bg-red-50 rounded border border-red-200">
    <span class="text-sm text-red-600">Original:</span>
    <!-- text -->
  </div>
  <!-- New text -->
  <div class="mb-4 p-3 bg-green-50 rounded border border-green-200">
    <span class="text-sm text-green-600">Improved:</span>
    <!-- text -->
  </div>
  <!-- Actions -->
  <div class="flex gap-2">
    <button class="px-4 py-2 bg-blue-500 text-white rounded 
                   hover:bg-blue-600">Accept</button>
    <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded 
                   hover:bg-gray-300">Rerun</button>
  </div>
</div>
```

## Technical Implementation Details

### State Management
```javascript
const state = {
  editor: {
    content: "",
    selection: { start: 0, end: 0 },
    savedRanges: []
  },
  commandPalette: {
    isOpen: false,
    search: "",
    selectedIndex: 0
  },
  results: {
    current: null,
    history: [],
    isLoading: false,
    showModal: false,
    modalPosition: { x: 0, y: 0 }
  },
  session: {
    id: "session_123",
    edits: []
  }
};
```

### Text Replacement
```javascript
function replaceText(start, end, newText) {
  // Save to undo stack
  undoStack.push({
    start, end,
    original: textarea.value.substring(start, end),
    replacement: newText
  });
  
  // Animate replacement
  textarea.classList.add('replacing');
  
  // Update text
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  textarea.value = before + newText + after;
  
  // Update cursor position
  textarea.setSelectionRange(
    start + newText.length,
    start + newText.length
  );
  
  // Cleanup
  setTimeout(() => {
    textarea.classList.remove('replacing');
  }, 300);
}
```

### Keyboard Shortcuts
- `Cmd/Ctrl + K`: Open command palette
- `Cmd/Ctrl + Z`: Undo last edit
- `Cmd/Ctrl + Shift + Z`: Redo
- `Escape`: Close panels/cancel
- `Enter`: Accept current result
- `Cmd/Ctrl + Enter`: Rerun command

## Future Enhancements

### Phase 2
- Real-time collaboration
- Version history with diff view
- Custom command creation
- Export options (PDF, HTML, DOCX)
- Dark mode

### Phase 3
- AI learns from accepted/rejected edits
- Multi-language support
- Voice input/output
- Integration with external tools
- Plugins system

## Success Metrics
- Time to complete edit: < 5 seconds
- Acceptance rate: > 60%
- Reruns per command: < 3
- User retention: > 40% weekly active

## Security Considerations
- No text stored permanently
- Session data expires after 24 hours
- API rate limiting: 100 requests/minute
- Input sanitization for markdown
- HTTPS only

## Performance Requirements
- Command palette opens: < 100ms
- AI response time: < 2 seconds
- Text replacement animation: 300ms
- No lag with 10,000 word documents