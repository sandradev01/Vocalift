# Vocalift - Background Noise Remover

Vocalift is a web application that removes background noise from audio files using DeepFilterNet, a state-of-the-art deep learning model for speech enhancement.

## Features

- 🎤 Record audio directly in the browser
- 📁 Upload existing audio files
- 🎚️ Adjustable noise reduction strength
- 🎧 Side-by-side comparison of original and cleaned audio
- ⬇️ Download the processed audio
- 🎨 Modern, responsive user interface

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- A modern web browser with JavaScript enabled

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vocalift.git
   cd vocalift
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

   Note: DeepFilterNet requires PyTorch, which may need to be installed separately for your specific system configuration. Visit [PyTorch's official website](https://pytorch.org/get-started/locally/) for installation instructions.

## Usage

1. Start the Flask development server:
   ```bash
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

3. Use the application:
   - Click "Browse Files" to upload an audio file, or
   - Click "Record Audio" to record directly from your microphone
   - Adjust the noise reduction strength using the slider
   - Click "Process Audio" to clean the audio
   - Compare the original and cleaned audio
   - Download the cleaned audio file

## Supported Audio Formats

- Input: WAV, MP3, OGG, FLAC, M4A
- Output: WAV (16kHz, mono)

## How It Works

Vocalift uses DeepFilterNet, a deep learning model specifically designed for speech enhancement. The model works by:

1. Analyzing the audio spectrogram to separate speech from noise
2. Applying a complex spectral mapping to enhance speech components
3. Reconstructing the time-domain signal with reduced background noise

The noise reduction strength parameter controls how aggressively the model removes background sounds, allowing you to find the right balance between noise reduction and audio quality.

## Troubleshooting

- **Slow processing**: Audio processing is computationally intensive. For longer recordings, please be patient.
- **Audio quality issues**: Try adjusting the noise reduction strength. Higher values remove more noise but may affect speech quality.
- **Browser issues**: Ensure you're using a modern browser with Web Audio API support (Chrome, Firefox, Safari, or Edge).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [DeepFilterNet](https://github.com/Rikorose/DeepFilterNet) - For the powerful speech enhancement model
- [Flask](https://flask.palletsprojects.com/) - For the web framework
- [Font Awesome](https://fontawesome.com/) - For the icons
