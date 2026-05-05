import os
import io
import shutil
import subprocess
import sys
import threading
import types
import torch
import torchaudio
import numpy as np
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import tempfile
import soundfile as sf
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', 50 * 1024 * 1024))
app.config['UPLOAD_FOLDER'] = tempfile.mkdtemp()
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24))

_model = None
_df_state = None
_enhance = None
_model_lock = threading.Lock()


def install_torch_six_compat():
    """Provide the small torch._six API that older DeepFilterNet releases import."""
    if 'torch._six' not in sys.modules:
        torch_six = types.ModuleType('torch._six')
        torch_six.string_classes = (str, bytes)
        sys.modules['torch._six'] = torch_six
        torch._six = torch_six


def get_deepfilter_model():
    global _model, _df_state, _enhance

    if _model is None or _df_state is None or _enhance is None:
        with _model_lock:
            if _model is None or _df_state is None or _enhance is None:
                logger.info("Initializing DeepFilterNet model")
                install_torch_six_compat()
                from df.enhance import enhance, init_df

                _model, _df_state, _ = init_df()
                _enhance = enhance
                logger.info("DeepFilterNet model initialized")

    return _model, _df_state, _enhance

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'wav', 'mp3', 'ogg', 'flac', 'm4a', 'webm'}

def convert_to_wav(input_path, output_path):
    """Ensure the provided audio is in 48 kHz mono WAV format.

    If the input is already a standard WAV file we simply copy it. Otherwise we
    load with torchaudio, convert to mono / 48 kHz and save as WAV.
    Returns True on success, False on failure.
    """
    try:
        # Short-circuit for regular WAV inputs – this avoids issues with some
        # recorder-generated WAV sub-formats that torchaudio may not parse.
        if os.path.splitext(input_path)[1].lower() == '.wav':
            shutil.copyfile(input_path, output_path)
            return True

        # Fallback: use torchaudio for conversion of non-WAV sources
        audio, sample_rate = torchaudio.load(input_path)

        # Convert to mono if multi-channel
        if audio.dim() > 1 and audio.size(0) > 1:
            audio = torch.mean(audio, dim=0, keepdim=True)

        # Resample to 48 kHz if necessary
        if sample_rate != 48000:
            resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=48000)
            audio = resampler(audio)
            sample_rate = 48000

        # Save the WAV
        torchaudio.save(output_path, audio, sample_rate)
        return True
    except Exception as e:
        logger.error(f"Error converting audio to WAV: {str(e)}", exc_info=True)
        # If torchaudio failed, try using ffmpeg as a fallback to convert the
        # file to the desired mono/48 kHz WAV. This gracefully handles WebM and
        # other browser-recorded formats that torchaudio cannot decode.
        try:
            subprocess.run(
                ['ffmpeg', '-y', '-i', input_path, '-ac', '1', '-ar', '48000', output_path],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            logger.info("Converted using ffmpeg fallback")
            return True
        except Exception as ff:
            logger.error(f"ffmpeg fallback failed: {ff}")
            return False

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/health')
def health():
    return jsonify({'status': 'ok'})


@app.route('/process', methods=['POST'])
def process_audio():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    file = request.files['audio']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed. Supported formats: WAV, MP3, OGG, FLAC, M4A'}), 400
    
    temp_path = None
    try:
        # Save the uploaded file temporarily
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = os.path.join(temp_dir, secure_filename(file.filename))
            file.save(temp_path)

            # Convert to WAV if needed
            wav_path = os.path.join(temp_dir, 'input.wav')
            if not convert_to_wav(temp_path, wav_path):
                return jsonify({'error': 'Failed to process audio file'}), 500

            logger.info("Processing audio")
            audio, sample_rate = torchaudio.load(wav_path)

            # Ensure mono shape [1, num_samples]
            if audio.dim() == 1:
                audio = audio.unsqueeze(0)
            elif audio.size(0) > 1:
                audio = torch.mean(audio, dim=0, keepdim=True)

            model, df_state, enhance = get_deepfilter_model()

            with torch.no_grad():
                enhanced_audio = enhance(model, df_state, audio)

                # Ensure proper shape for saving
                if enhanced_audio.dim() == 1:
                    enhanced_audio = enhanced_audio.unsqueeze(0)

                output = io.BytesIO()
                sf.write(output, enhanced_audio.numpy().T, sample_rate, format='WAV')
                output.seek(0)

                logger.info("Audio processing completed successfully")
                return send_file(
                    output,
                    mimetype='audio/wav',
                    as_attachment=False,
                    download_name='cleaned_audio.wav'
                )
            
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to process audio: {str(e)}'}), 500

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=port)
