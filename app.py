import os
from flask import Flask, request, render_template, send_file
from df import enhance, init_df
import torchaudio
import torch

torchaudio.set_audio_backend("soundfile")  # ← ADD THIS

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "outputs"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return "No file part", 400
    file = request.files['file']
    if file.filename == '':
        return "No selected file", 400

    # Save the uploaded file
    input_path = os.path.join(UPLOAD_FOLDER, file.filename)
    output_path = os.path.join(OUTPUT_FOLDER, "cleaned_" + file.filename)
    file.save(input_path)

    # Load audio
    wav, sr = torchaudio.load(input_path)

    # Convert to mono
    if wav.shape[0] > 1:
        wav = wav.mean(dim=0).unsqueeze(0)

    # Resample to 48kHz if needed
    if sr != 48000:
        wav = torchaudio.transforms.Resample(orig_freq=sr, new_freq=48000)(wav)
        sr = 48000

    # Initialize model
    model, df_state, _ = init_df()


    # Clean the audio
    enhanced_wav = enhance(model, df_state, wav)

    # Save cleaned output
    torchaudio.save(output_path, enhanced_wav, sample_rate=sr)

    return send_file(output_path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
