// State management
const state = {
    selectedText: '',
    selectionStart: 0,
    selectionEnd: 0,
    commandPalette: {
        isOpen: false
    },
    resultModal: {
        isOpen: false,
        command: null,
        attempts: 0,
        history: []
    }
};

// DOM elements
const editor = document.getElementById('editor');
const commandPalette = document.getElementById('commandPalette');
const resultModal = document.getElementById('resultModal');
const selectionPreview = document.querySelector('#selectionPreview > div');
const promptInput = document.getElementById('promptInput');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // Command palette trigger
    editor.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            openCommandPalette();
        }
    });

    // Prompt input handling
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitPrompt();
        } else if (e.key === 'Escape') {
            closeCommandPalette();
        }
    });

    // Click outside to close command palette
    document.addEventListener('click', (e) => {
        if (state.commandPalette.isOpen && !commandPalette.contains(e.target)) {
            closeCommandPalette();
        }
    });

    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) {
            closeResultModal();
        }
    });

    // Result modal actions
    document.getElementById('acceptBtn').addEventListener('click', acceptResult);
    document.getElementById('rerunBtn').addEventListener('click', rerunCommand);
    document.getElementById('cancelBtn').addEventListener('click', closeResultModal);

    // Result modal keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (state.resultModal.isOpen) {
            // Don't allow actions while buttons are disabled (loading state)
            const acceptBtn = document.getElementById('acceptBtn');
            if (acceptBtn.disabled) {
                return;
            }
            
            if (e.key === 'Enter') {
                e.preventDefault();
                acceptResult();
            } else if (e.key.toLowerCase() === 'x') {
                e.preventDefault();
                rerunCommand();
            } else if (e.key === 'Escape') {
                closeResultModal();
            }
        }
    });

}

function openCommandPalette() {
    // Get selected text from textarea
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value.substring(start, end).trim();
    
    state.selectionStart = start;
    state.selectionEnd = end;
    
    if (text) {
        // Editing mode - text is selected
        state.selectedText = text;
        
        // Show preview
        selectionPreview.textContent = text;
        document.getElementById('selectionPreview').classList.remove('hidden');
        promptInput.placeholder = "What would you like to do with this text?";
    } else {
        // Generation mode - no text selected  
        state.selectedText = '';
        
        // Hide preview
        document.getElementById('selectionPreview').classList.add('hidden');
        promptInput.placeholder = "What would you like to write?";
    }
    
    // Show palette
    state.commandPalette.isOpen = true;
    promptInput.value = '';
    commandPalette.classList.remove('hidden');
    
    // Focus prompt input
    setTimeout(() => promptInput.focus(), 10);
}

function closeCommandPalette() {
    state.commandPalette.isOpen = false;
    commandPalette.classList.add('hidden');
}


function submitPrompt() {
    const prompt = promptInput.value.trim();
    if (prompt) {
        const command = {
            id: 'custom',
            name: 'Custom Prompt',
            customPrompt: prompt
        };
        closeCommandPalette();
        // Keep selection visible during processing
        maintainSelection();
        executeCommand(command);
    }
}

function maintainSelection() {
    // Keep the editor focused and selection visible
    editor.focus();
    editor.setSelectionRange(state.selectionStart, state.selectionEnd);
}

function getContextBefore() {
    // Get ~100 characters before the selection/cursor
    const start = Math.max(0, state.selectionStart - 100);
    return editor.value.substring(start, state.selectionStart);
}

function getContextAfter() {
    // Get ~100 characters after the selection/cursor
    const end = Math.min(editor.value.length, state.selectionEnd + 100);
    return editor.value.substring(state.selectionEnd, end);
}

async function executeCommand(command) {
    state.resultModal.command = command;
    state.resultModal.attempts = 1;
    
    // Show loading state
    showLoadingModal(command.customPrompt);
    // Keep selection visible while loading
    maintainSelection();
    
    // Call real API
    const result = await processTextWithAPI(state.selectedText, command);
    
    showResultModal(result);
    // Keep selection visible with result
    maintainSelection();
}

async function processTextWithAPI(text, command) {
    try {
        // Get context around cursor position for generation mode
        const contextBefore = getContextBefore();
        const contextAfter = getContextAfter();
        
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                prompt: command.customPrompt,
                attempt: state.resultModal.attempts || 1,
                context: {
                    before: contextBefore,
                    after: contextAfter
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'API request failed');
        }

        const data = await response.json();
        return data.result;
        
    } catch (error) {
        console.error('API Error:', error);
        // Fallback to mock response if API fails
        return `[API Error: ${error.message}]\n\nFallback response for "${command.customPrompt}": This would be the processed text.`;
    }
}

function showLoadingModal(prompt) {
    document.getElementById('commandName').textContent = prompt;
    document.getElementById('attemptNumber').textContent = state.resultModal.attempts;
    
    if (state.selectedText) {
        // Editing mode - show original text
        document.getElementById('originalText').textContent = state.selectedText;
        document.querySelector('#resultModal .mb-4').style.display = 'block';
    } else {
        // Generation mode - hide original text section  
        document.querySelector('#resultModal .mb-4').style.display = 'none';
    }
    
    document.querySelector('#resultModal .mb-6').style.display = 'block'; // show result text section
    
    // Put loading message in the result text area
    document.getElementById('resultText').innerHTML = `
        <div class="flex items-center gap-2 text-gray-500">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
            Processing your request...
        </div>
    `;
    
    // Disable action buttons during loading
    document.getElementById('acceptBtn').disabled = true;
    document.getElementById('rerunBtn').disabled = true;
    
    state.resultModal.isOpen = true;
    resultModal.classList.remove('hidden');
}

function showResultModal(result) {
    // Everything should already be visible, just update the result
    document.getElementById('commandName').textContent = state.resultModal.command.customPrompt;
    document.getElementById('attemptNumber').textContent = state.resultModal.attempts;
    document.getElementById('resultText').textContent = result;
    
    if (state.selectedText) {
        // Editing mode - show original text
        document.getElementById('originalText').textContent = state.selectedText;
        document.querySelector('#resultModal .mb-4').style.display = 'block';
    } else {
        // Generation mode - hide original text section (should already be hidden from loading)
        document.querySelector('#resultModal .mb-4').style.display = 'none';
    }
    
    // Re-enable action buttons
    document.getElementById('acceptBtn').disabled = false;
    document.getElementById('rerunBtn').disabled = false;
    
    state.resultModal.isOpen = true;
    resultModal.classList.remove('hidden');
}

function closeResultModal() {
    state.resultModal.isOpen = false;
    resultModal.classList.add('hidden');
}

function acceptResult() {
    const resultText = document.getElementById('resultText').textContent;
    
    if (state.selectedText) {
        // Editing mode - replace selected text
        const before = editor.value.substring(0, state.selectionStart);
        const after = editor.value.substring(state.selectionEnd);
        
        editor.value = before + resultText + after;
        
        // Set cursor position at end of new text
        const newEnd = state.selectionStart + resultText.length;
        editor.setSelectionRange(newEnd, newEnd);
    } else {
        // Generation mode - insert text at cursor position
        const before = editor.value.substring(0, state.selectionStart);
        const after = editor.value.substring(state.selectionStart);
        
        editor.value = before + resultText + after;
        
        // Set cursor position at end of new text
        const newEnd = state.selectionStart + resultText.length;
        editor.setSelectionRange(newEnd, newEnd);
    }
    
    editor.focus();
    closeResultModal();
}

async function rerunCommand() {
    state.resultModal.attempts++;
    
    // Show loading state
    showLoadingModal(state.resultModal.command.customPrompt);
    // Keep selection visible while loading
    maintainSelection();
    
    const result = await processTextWithAPI(state.selectedText, state.resultModal.command);
    showResultModal(result);
    // Keep selection visible with result
    maintainSelection();
}


