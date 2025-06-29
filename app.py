# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "flask>=3.0.0",
#     "flask-cors>=4.0.0",
#     "llm>=0.13.1",
#     "typer>=0.9.0",
# ]
# ///

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import llm
import logging
import os
import typer
from pathlib import Path

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from frontend
cli = typer.Typer()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global system prompt
SYSTEM_PROMPT = ""

@app.route('/')
def index():
    """Serve the main application"""
    return send_from_directory('.', 'index.html')

@app.route('/app.js')
def app_js():
    """Serve the JavaScript file"""
    return send_from_directory('.', 'app.js')

@app.route('/api/process', methods=['POST'])
def process_text():
    """Process text with AI based on custom prompt"""
    try:
        data = request.get_json()
        
        # Extract required fields
        text = data.get('text', '').strip()
        prompt = data.get('prompt', '').strip()
        
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400
        
        # Optional fields
        attempt = data.get('attempt', 1)
        context_before = data.get('context', {}).get('before', '')
        context_after = data.get('context', {}).get('after', '')
        
        logger.info(f"Processing request - Prompt: '{prompt[:50]}...', Text length: {len(text)}")
        
        # Build the full prompt with context
        full_prompt = build_prompt(text, prompt, context_before, context_after)
        
        # Use LLM to process the text
        model = llm.get_model("gpt-3.5-turbo")  # You can change this to your preferred model
        response = model.prompt(full_prompt)
        
        result = response.text().strip()
        
        return jsonify({
            'id': f"result_{attempt}_{hash(text + prompt) % 10000}",
            'original': text,
            'result': result,
            'prompt': prompt,
            'attempt': attempt,
            'metadata': {
                'model': 'gpt-3.5-turbo',
                'tokens': len(full_prompt.split()) + len(result.split()),
                'success': True
            }
        })
        
    except Exception as e:
        logger.error(f"Error processing text: {str(e)}")
        return jsonify({
            'error': 'Failed to process text',
            'message': str(e)
        }), 500

def build_prompt(text, user_prompt, context_before="", context_after=""):
    """Build the full prompt for the LLM"""
    
    # Start with system prompt if available
    if SYSTEM_PROMPT:
        system_section = f"{SYSTEM_PROMPT}\n\n"
    else:
        system_section = ""
    
    # Handle text generation vs text editing
    if not text.strip():
        # Generation mode - no text selected
        if SYSTEM_PROMPT:
            # If we have a system prompt, just add the user request
            base_instruction = f"The user wants you to generate text based on this request: {user_prompt}"
        else:
            # Default instruction if no system prompt
            base_instruction = f"""You are a helpful writing assistant. The user wants you to generate text based on this request: {user_prompt}

Please respond with ONLY the generated text, without any explanation or additional commentary."""
        
        # Add context if available for generation
        if context_before or context_after:
            context_section = "\n\nHere's the context where the text should be inserted:"
            if context_before:
                context_section += f"\n\nBEFORE: ...{context_before}"
            context_section += f"\n\n[INSERT NEW TEXT HERE]"
            if context_after:
                context_section += f"\n\nAFTER: {context_after}..."
            context_section += "\n\nGenerated text:"
        else:
            context_section = "\n\nGenerated text:"
            
    else:
        # Editing mode - text is selected
        if SYSTEM_PROMPT:
            # If we have a system prompt, just add the user request
            base_instruction = f"The user has selected some text and wants you to: {user_prompt}"
        else:
            # Default instruction if no system prompt
            base_instruction = f"""You are a helpful writing assistant. The user has selected some text and wants you to: {user_prompt}

Please respond with ONLY the modified text, without any explanation or additional commentary."""
        
        # Add context if available
        if context_before or context_after:
            context_section = "\n\nHere's the context around the selected text:"
            if context_before:
                context_section += f"\n\nBEFORE: ...{context_before}"
            context_section += f"\n\nSELECTED TEXT: {text}"
            if context_after:
                context_section += f"\n\nAFTER: {context_after}..."
        else:
            context_section = f"\n\nSelected text to modify:\n{text}"
        
        context_section += "\n\nModified text:"
    
    full_prompt = system_section + base_instruction + context_section
    
    return full_prompt

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test that llm is working
        model = llm.get_model("gpt-3.5-turbo")
        return jsonify({
            'status': 'healthy',
            'model': 'gpt-3.5-turbo',
            'available': True
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@app.route('/api/models', methods=['GET'])
def list_models():
    """List available LLM models"""
    try:
        models = []
        for model in llm.get_models():
            models.append({
                'id': model.model_id,
                'name': getattr(model, 'name', model.model_id)
            })
        
        return jsonify({'models': models})
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        return jsonify({
            'error': 'Failed to list models',
            'message': str(e)
        }), 500

def load_system_prompt(file_path: Path) -> str:
    """Load system prompt from markdown file"""
    try:
        return file_path.read_text(encoding='utf-8').strip()
    except Exception as e:
        logger.error(f"Error loading system prompt from {file_path}: {e}")
        return ""

@cli.command()
def serve(
    system_prompt: str = typer.Option(
        None, 
        "--system-prompt", 
        "-s",
        help="Path to markdown file containing system prompt"
    ),
    host: str = typer.Option("127.0.0.1", "--host", help="Host to bind to"),
    port: int = typer.Option(5000, "--port", help="Port to bind to"),
    debug: bool = typer.Option(False, "--debug", help="Enable debug mode")
):
    """Start the AI Writing Assistant Flask Server"""
    global SYSTEM_PROMPT
    
    # Load system prompt if provided
    if system_prompt:
        prompt_path = Path(system_prompt)
        if prompt_path.exists():
            SYSTEM_PROMPT = load_system_prompt(prompt_path)
            logger.info(f"Loaded system prompt from {prompt_path} ({len(SYSTEM_PROMPT)} characters)")
        else:
            typer.echo(f"Error: System prompt file not found: {prompt_path}", err=True)
            raise typer.Exit(1)
    
    print("Starting AI Writing Assistant Flask Server...")
    print("Available endpoints:")
    print("  POST /api/process - Process text with AI")
    print("  GET  /api/health  - Health check")
    print("  GET  /api/models  - List available models")
    print("\nMake sure to set up your API keys:")
    print("  export OPENAI_API_KEY=your_key_here")
    print("  or configure other models with: llm install llm-claude-3")
    
    if SYSTEM_PROMPT:
        print(f"\nUsing system prompt: {SYSTEM_PROMPT[:100]}{'...' if len(SYSTEM_PROMPT) > 100 else ''}")
    
    app.run(debug=debug, host=host, port=port)

if __name__ == '__main__':
    cli()