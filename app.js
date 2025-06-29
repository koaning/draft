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
    },
    undoHistory: [],
    undoDebounceTimer: null,
    maxUndoStates: 20  // Limit to 20 undo states to prevent memory issues
};

// DOM elements
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const documentName = document.getElementById('documentName');
const commandPalette = document.getElementById('commandPalette');
const resultModal = document.getElementById('resultModal');
const selectionPreview = document.querySelector('#selectionPreview > div');
const promptInput = document.getElementById('promptInput');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updatePreview(); // Initial preview update
});

function setupEventListeners() {
    // Command palette trigger and undo
    editor.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            openCommandPalette();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            performUndo();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            saveDocument();
        }
    });
    
    // Update preview on input and debounce undo state saving
    editor.addEventListener('input', (e) => {
        updatePreview();
        // Debounce undo state saving to avoid excessive memory usage
        if (e.inputType && e.inputType !== 'insertCompositionText') {
            debouncedSaveUndoState();
        }
    });
    
    // Drag and drop for images
    setupDragAndDrop();
    
    // Paste link functionality
    editor.addEventListener('paste', handlePaste);

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
    
    // Save/render button
    document.getElementById('renderBtn').addEventListener('click', saveDocument);

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
    // Save undo state before AI edit
    saveUndoState();
    
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
    updatePreview(); // Update preview after accepting changes
    closeResultModal();
}

function updatePreview() {
    const markdownText = editor.value;
    
    if (markdownText.trim() === '') {
        preview.innerHTML = '<p class="text-gray-400 italic">Start typing to see your markdown preview...</p>';
        return;
    }
    
    try {
        // Configure marked to allow HTML
        marked.setOptions({
            breaks: true,
            gfm: true,
            sanitize: false,  // Allow raw HTML
            silent: false
        });
        
        // Parse markdown and render HTML
        let html = marked.parse(markdownText);
        
        // Convert relative image paths to Flask-served paths for preview
        const docName = documentName.value.trim();
        if (docName) {
            html = html.replace(
                /src="([^"\/]+\.(png|jpg|jpeg|gif|webp))"/g, 
                `src="/images/${encodeURIComponent(docName)}/$1"`
            );
        }
        
        preview.innerHTML = html;
    } catch (error) {
        console.error('Error parsing markdown:', error);
        preview.innerHTML = '<p class="text-red-500">Error rendering markdown preview</p>';
    }
}

function setupDragAndDrop() {
    let dragCounter = 0;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        editor.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area
    ['dragenter', 'dragover'].forEach(eventName => {
        editor.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        editor.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    editor.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dragCounter++;
        editor.classList.add('border-blue-400', 'bg-blue-50');
    }
    
    function unhighlight() {
        dragCounter--;
        if (dragCounter === 0) {
            editor.classList.remove('border-blue-400', 'bg-blue-50');
        }
    }
    
    async function handleDrop(e) {
        dragCounter = 0;
        // Force remove highlighting immediately
        editor.classList.remove('border-blue-400', 'bg-blue-50');
        
        const files = Array.from(e.dataTransfer.files);
        
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                await uploadImage(file);
            }
        }
    }
}

async function uploadImage(file) {
    const docName = documentName.value.trim();
    if (!docName) {
        alert('Please enter a document name before uploading images');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentName', docName);
        
        const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        const result = await response.json();
        console.log('Upload result:', result);
        console.log('Markdown to insert:', result.markdown);
        console.log('Type of markdown:', typeof result.markdown);
        console.log('First 100 chars:', result.markdown.substring(0, 100));
        
        // Save undo state before modifying editor content
        saveUndoState();
        
        // Insert figure markdown at cursor position
        const cursorPos = editor.selectionStart;
        const textBefore = editor.value.substring(0, cursorPos);
        const textAfter = editor.value.substring(cursorPos);
        
        const newText = textBefore + result.markdown + '\n\n' + textAfter;
        editor.value = newText;
        
        console.log('Editor content after insert:', editor.value);
        
        // Update preview immediately to see the figure
        updatePreview();
        
        // Find and select the caption placeholder for easy editing
        const captionPlaceholder = 'ADD_CAPTION_HERE';
        const captionStart = newText.indexOf(captionPlaceholder, cursorPos);
        
        if (captionStart !== -1) {
            // Focus editor and select the placeholder text so user can type caption immediately
            editor.focus();
            editor.setSelectionRange(captionStart, captionStart + captionPlaceholder.length);
            console.log(`Selected "${captionPlaceholder}" at position ${captionStart}-${captionStart + captionPlaceholder.length}`);
        } else {
            // Fallback: position cursor after the figure
            const newCursorPos = cursorPos + result.markdown.length + 2;
            editor.focus();
            editor.setSelectionRange(newCursorPos, newCursorPos);
            console.log(`Caption placeholder not found, positioned cursor at ${newCursorPos}`);
        }
        
        console.log('Image uploaded:', result.filename);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload image: ${error.message}`);
    }
}

function handlePaste(e) {
    // Get clipboard data
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');
    
    // Check if it looks like a URL
    const urlRegex = /^https?:\/\/[^\s]+$/;
    if (!urlRegex.test(pastedText.trim())) {
        return; // Let default paste behavior happen
    }
    
    // Check if text is selected
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    
    if (start === end) {
        return; // No selection, let default paste happen
    }
    
    // Prevent default paste
    e.preventDefault();
    
    // Save undo state before link creation
    saveUndoState();
    
    // Get selected text
    const selectedText = editor.value.substring(start, end);
    
    // Create markdown link
    const markdownLink = `[${selectedText}](${pastedText.trim()})`;
    
    // Replace selection with markdown link
    const textBefore = editor.value.substring(0, start);
    const textAfter = editor.value.substring(end);
    
    editor.value = textBefore + markdownLink + textAfter;
    
    // Set cursor position after the link
    const newCursorPos = start + markdownLink.length;
    editor.setSelectionRange(newCursorPos, newCursorPos);
    
    // Update preview
    updatePreview();
    
    console.log('Created markdown link:', markdownLink);
}

function saveUndoState() {
    const currentState = {
        content: editor.value,
        selectionStart: editor.selectionStart,
        selectionEnd: editor.selectionEnd,
        timestamp: Date.now()
    };
    
    // Don't save if content is identical to last state
    const lastState = state.undoHistory[state.undoHistory.length - 1];
    if (lastState && lastState.content === currentState.content) {
        return;
    }
    
    state.undoHistory.push(currentState);
    
    // Limit history size to prevent memory issues
    if (state.undoHistory.length > state.maxUndoStates) {
        state.undoHistory.shift(); // Remove oldest state
    }
    
    console.log(`Undo state saved. History size: ${state.undoHistory.length}`);
}

function debouncedSaveUndoState() {
    // Clear existing timer
    if (state.undoDebounceTimer) {
        clearTimeout(state.undoDebounceTimer);
    }
    
    // Save state after 1 second of no typing
    state.undoDebounceTimer = setTimeout(() => {
        saveUndoState();
    }, 1000);
}

function performUndo() {
    if (state.undoHistory.length === 0) {
        console.log('No undo history available');
        return;
    }
    
    // Get the last state
    const lastState = state.undoHistory.pop();
    
    // Restore content and cursor position
    editor.value = lastState.content;
    editor.setSelectionRange(lastState.selectionStart, lastState.selectionEnd);
    editor.focus();
    
    // Update preview
    updatePreview();
    
    console.log(`Undid to previous state. History size: ${state.undoHistory.length}`);
}

async function saveDocument() {
    const docName = documentName.value.trim();
    const content = editor.value;
    
    if (!docName) {
        alert('Please enter a document name before saving');
        return;
    }
    
    if (!content.trim()) {
        alert('Document is empty - nothing to save');
        return;
    }
    
    try {
        // Update button to show saving state
        const renderBtn = document.getElementById('renderBtn');
        const originalText = renderBtn.textContent;
        renderBtn.textContent = 'Saving...';
        renderBtn.disabled = true;
        
        const response = await fetch('/api/save-document', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                documentName: docName,
                content: content
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Save failed');
        }
        
        const result = await response.json();
        console.log('Document saved:', result.path);
        
        // Show success feedback
        renderBtn.textContent = 'Saved!';
        setTimeout(() => {
            renderBtn.textContent = originalText;
            renderBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Save error:', error);
        alert(`Failed to save document: ${error.message}`);
        
        // Reset button
        const renderBtn = document.getElementById('renderBtn');
        renderBtn.textContent = 'Render';
        renderBtn.disabled = false;
    }
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


