import os
import io
import torch
import torchaudio
import numpy as np
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import tempfile
import soundfile as sf
from deepfilternet import DeepFilterNet

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['UPLOAD_FOLDER'] = tempfile.mkdtemp()
app.secret_key = os.urandom(24)

# Initialize DeepFilterNet model
model = DeepFilterNet()
model.eval()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'wav', 'mp3', 'ogg', 'flac', 'm4a'}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process_audio():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    file = request.files['audio']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    try:
        # Get noise reduction strength (0.0 to 1.0)
        strength = float(request.form.get('strength', 0.7))
        strength = max(0.0, min(1.0, strength))  # Clamp between 0 and 1
        
        # Save the uploaded file temporarily
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(file.filename))
        file.save(temp_path)
        
        # Process the audio with DeepFilterNet
        output = process_audio_file(temp_path, strength)
        
        # Clean up the temporary file
        os.remove(temp_path)
        
        # Return the processed audio
        return send_file(
            output,
            mimetype='audio/wav',
            as_attachment=False,
            download_name='cleaned_audio.wav'
        )
        
    except Exception as e:
        print(f"Error processing audio: {str(e)}")
        return jsonify({'error': 'Failed to process audio'}), 500

def process_audio_file(input_path, strength):
    """Process audio file using DeepFilterNet"""
    try:
        # Load audio file
        audio, sample_rate = torchaudio.load(input_path)
        
        # Convert to mono if stereo
        if audio.dim() > 1 and audio.size(0) > 1:
            audio = torch.mean(audio, dim=0, keepdim=True)
        
        # Resample to 16kHz if needed (DeepFilterNet's expected sample rate)
        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
            audio = resampler(audio)
            sample_rate = 16000
        
        # Process with DeepFilterNet
        with torch.no_grad():
            # Apply noise reduction with the specified strength
            enhanced_audio = model(audio, strength=strength)
        
        # Create an in-memory file
        output = io.BytesIO()
        
        # Save the processed audio to the in-memory file
        sf.write(output, enhanced_audio.numpy().T, sample_rate, format='WAV')
        output.seek(0)
        
        return output
        
    except Exception as e:
        print(f"Error in process_audio_file: {str(e)}")
        raise

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
