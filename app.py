# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "flask>=3.0.0",
#     "flask-cors>=4.0.0",
#     "llm>=0.13.1",
# ]
# ///

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import llm
import logging
import os

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from frontend

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
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
    
    # Base instruction
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
    
    full_prompt = base_instruction + context_section + "\n\nModified text:"
    
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

if __name__ == '__main__':
    print("Starting AI Writing Assistant Flask Server...")
    print("Available endpoints:")
    print("  POST /api/process - Process text with AI")
    print("  GET  /api/health  - Health check")
    print("  GET  /api/models  - List available models")
    print("\nMake sure to set up your API keys:")
    print("  export OPENAI_API_KEY=your_key_here")
    print("  or configure other models with: llm install llm-claude-3")
    
    app.run(debug=True, host='127.0.0.1', port=5000)