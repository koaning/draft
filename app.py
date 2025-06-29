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
from werkzeug.utils import secure_filename
from flask_cors import CORS
import llm
import logging
import os
import typer
import uuid
from datetime import datetime
from pathlib import Path

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from frontend
cli = typer.Typer()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask app configuration will be used instead of globals

@app.route('/')
def index():
    """Serve the main application"""
    return send_from_directory('.', 'index.html')

@app.route('/app.js')
def app_js():
    """Serve the JavaScript file"""
    return send_from_directory('.', 'app.js')

@app.route('/images/<document_name>/<filename>')
def serve_image(document_name, filename):
    """Serve images from document folders"""
    try:
        logger.info(f"Image request: {document_name}/{filename}")
        
        # Validate document name
        sanitized_name = sanitize_document_name(document_name)
        if not sanitized_name:
            logger.error(f"Invalid document name: {document_name}")
            return "Invalid document name", 400
        
        # Get document folder
        doc_folder = get_document_folder(document_name)
        logger.info(f"Looking for image in: {doc_folder}")
        
        if not doc_folder.exists():
            logger.error(f"Document folder not found: {doc_folder}")
            return "Document folder not found", 404
        
        # Check if file exists
        file_path = doc_folder / filename
        if not file_path.exists():
            logger.error(f"Image file not found: {file_path}")
            return "Image file not found", 404
        
        logger.info(f"Serving image: {file_path}")
        # Serve the image file
        return send_from_directory(str(doc_folder), filename)
        
    except Exception as e:
        logger.error(f"Error serving image: {e}")
        return "Image not found", 404

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
    system_prompt = app.config.get('SYSTEM_PROMPT', '')
    if system_prompt:
        system_section = f"{system_prompt}\n\n"
    else:
        system_section = ""
    
    # Handle text generation vs text editing
    if not text.strip():
        # Generation mode - no text selected
        if system_prompt:
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
        if system_prompt:
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

def sanitize_document_name(name: str) -> str:
    """Sanitize document name for use as folder/file name"""
    if not name or not name.strip():
        return None
    
    # Remove/replace problematic characters
    import re
    sanitized = re.sub(r'[<>:"/\\|?*]', '-', name.strip())
    sanitized = re.sub(r'\s+', '-', sanitized)  # Replace spaces with hyphens
    sanitized = sanitized.strip('-')  # Remove leading/trailing hyphens
    
    return sanitized if sanitized else None

def get_document_folder(document_name: str) -> Path:
    """Get the folder path for a document"""
    write_folder = app.config.get('WRITE_FOLDER')
    if not write_folder:
        raise ValueError("Write folder not configured")
    
    sanitized_name = sanitize_document_name(document_name)
    if not sanitized_name:
        raise ValueError("Invalid document name")
    
    return write_folder / sanitized_name

def create_frontmatter_content(title: str, content: str) -> str:
    """Create markdown content with frontmatter"""
    now = datetime.now().isoformat()
    frontmatter = f"""---
title: "{title}"
date: "{now}"
---

{content}"""
    return frontmatter

@app.route('/api/validate-name', methods=['POST'])
def validate_document_name():
    """Validate document name"""
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        
        if not name:
            return jsonify({
                'valid': False,
                'warning': 'Document name cannot be empty'
            })
        
        sanitized = sanitize_document_name(name)
        if not sanitized:
            return jsonify({
                'valid': False,
                'warning': 'Document name contains only invalid characters'
            })
        
        return jsonify({
            'valid': True,
            'sanitized': sanitized
        })
        
    except Exception as e:
        logger.error(f"Error validating document name: {e}")
        return jsonify({'error': 'Validation failed'}), 500

@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    """Upload image and return markdown syntax"""
    try:
        logger.info(f"Upload request received - Content-Type: {request.content_type}")
        logger.info(f"Form data: {list(request.form.keys())}")
        logger.info(f"Files: {list(request.files.keys())}")
        
        # Check if document name is provided
        document_name = request.form.get('documentName', '').strip()
        logger.info(f"Document name: '{document_name}'")
        if not document_name:
            return jsonify({'error': 'Document name is required'}), 400
        
        # Validate document name
        sanitized_name = sanitize_document_name(document_name)
        logger.info(f"Sanitized name: '{sanitized_name}'")
        if not sanitized_name:
            return jsonify({'error': 'Invalid document name'}), 400
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        logger.info(f"File received: {file.filename}, Content-Type: {file.content_type}")
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file type
        allowed_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
        file_ext = Path(file.filename).suffix.lower()
        logger.info(f"File extension: '{file_ext}'")
        if file_ext not in allowed_extensions:
            return jsonify({'error': f'Unsupported file type: {file_ext}'}), 400
        
        # Get document folder and create if needed
        doc_folder = get_document_folder(document_name)
        logger.info(f"Document folder: {doc_folder}")
        doc_folder.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename with UUID
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = doc_folder / unique_filename
        logger.info(f"Saving to: {file_path}")
        
        # Save the file
        file.save(str(file_path))
        logger.info(f"Successfully saved image: {file_path}")
        
        try:
            # Create figure with caption placeholder using relative path for downstream blog
            # Images are in the same folder as the markdown file
            figure_markdown = f"""<figure>
    <img src="{unique_filename}" alt="Uploaded image" />
    <figcaption>ADD_CAPTION_HERE</figcaption>
</figure>"""
            logger.info(f"Generated figure markdown: {figure_markdown}")
            
            response_data = {
                'success': True,
                'filename': unique_filename,
                'markdown': figure_markdown,
                'path': str(file_path),
                'document_name': sanitized_name
            }
            logger.info(f"Returning response: {response_data}")
            return jsonify(response_data)
        except Exception as e:
            logger.error(f"Error creating response: {e}")
            raise
        
    except Exception as e:
        logger.error(f"Error uploading image: {e}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Image upload failed: {str(e)}'}), 500

@app.route('/api/save-document', methods=['POST'])
def save_document():
    """Save document with frontmatter"""
    try:
        data = request.get_json()
        document_name = data.get('documentName', '').strip()
        content = data.get('content', '')
        
        if not document_name:
            return jsonify({'error': 'Document name is required'}), 400
        
        # Validate and get document folder
        doc_folder = get_document_folder(document_name)
        doc_folder.mkdir(parents=True, exist_ok=True)
        
        # Create markdown file with frontmatter - always save as index.md
        markdown_content = create_frontmatter_content(document_name, content)
        file_path = doc_folder / "index.md"
        
        file_path.write_text(markdown_content, encoding='utf-8')
        
        logger.info(f"Saved document: {file_path}")
        
        return jsonify({
            'success': True,
            'path': str(file_path),
            'folder': str(doc_folder)
        })
        
    except Exception as e:
        logger.error(f"Error saving document: {e}")
        return jsonify({'error': 'Save failed'}), 500

def load_system_prompt(file_path: Path) -> str:
    """Load system prompt from markdown file"""
    try:
        return file_path.read_text(encoding='utf-8').strip()
    except Exception as e:
        logger.error(f"Error loading system prompt from {file_path}: {e}")
        return ""

@cli.command()
def serve(
    write_folder: str = typer.Option(
        ..., 
        "--write-folder", 
        "-w",
        help="Path to folder where documents and images will be saved"
    ),
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
    # Validate and set write folder
    write_path = Path(write_folder)
    if not write_path.exists():
        try:
            write_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created write folder: {write_path}")
        except Exception as e:
            typer.echo(f"Error: Cannot create write folder {write_path}: {e}", err=True)
            raise typer.Exit(1)
    elif not write_path.is_dir():
        typer.echo(f"Error: Write folder path exists but is not a directory: {write_path}", err=True)
        raise typer.Exit(1)
    
    app.config['WRITE_FOLDER'] = write_path.resolve()
    logger.info(f"Using write folder: {app.config['WRITE_FOLDER']}")
    
    # Load system prompt if provided
    if system_prompt:
        prompt_path = Path(system_prompt)
        if prompt_path.exists():
            app.config['SYSTEM_PROMPT'] = load_system_prompt(prompt_path)
            logger.info(f"Loaded system prompt from {prompt_path} ({len(app.config['SYSTEM_PROMPT'])} characters)")
        else:
            typer.echo(f"Error: System prompt file not found: {prompt_path}", err=True)
            raise typer.Exit(1)
    else:
        app.config['SYSTEM_PROMPT'] = ''
    
    print("Starting AI Writing Assistant Flask Server...")
    print("Available endpoints:")
    print("  POST /api/process - Process text with AI")
    print("  GET  /api/health  - Health check")
    print("  GET  /api/models  - List available models")
    print("  POST /api/upload-image - Upload images")
    print("  POST /api/save-document - Save document with frontmatter")
    print("  GET  /api/validate-name - Validate document name")
    print(f"\nWrite folder: {app.config['WRITE_FOLDER']}")
    print("\nMake sure to set up your API keys:")
    print("  export OPENAI_API_KEY=your_key_here")
    print("  or configure other models with: llm install llm-claude-3")
    
    if app.config.get('SYSTEM_PROMPT'):
        system_prompt_preview = app.config['SYSTEM_PROMPT']
        print(f"\nUsing system prompt: {system_prompt_preview[:100]}{'...' if len(system_prompt_preview) > 100 else ''}")
    
    app.run(debug=debug, host=host, port=port)

if __name__ == '__main__':
    cli()