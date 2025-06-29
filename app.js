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
    
    if (text) {
        state.selectedText = text;
        state.selectionStart = start;
        state.selectionEnd = end;
        
        // Show preview
        selectionPreview.textContent = text;
        document.getElementById('selectionPreview').classList.remove('hidden');
    } else {
        // Hide preview if no selection
        document.getElementById('selectionPreview').classList.add('hidden');
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
                    // Could add surrounding context here later
                    before: '',
                    after: ''
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
    
    // Show the original text, put loading in result section
    document.getElementById('originalText').textContent = state.selectedText;
    document.querySelector('#resultModal .mb-4').style.display = 'block'; // show original text section
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
    document.getElementById('originalText').textContent = state.selectedText;
    document.getElementById('resultText').textContent = result;
    
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
    
    // Replace text in editor using stored selection positions
    if (state.selectedText) {
        const before = editor.value.substring(0, state.selectionStart);
        const after = editor.value.substring(state.selectionEnd);
        
        editor.value = before + resultText + after;
        
        // Set cursor position at end of new text
        const newEnd = state.selectionStart + resultText.length;
        editor.setSelectionRange(newEnd, newEnd);
        editor.focus();
    }
    
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


