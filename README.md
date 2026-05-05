# Vocalift - Background Noise Remover

Vocalift is a Flask web app that removes background noise from uploaded or recorded audio using DeepFilterNet.

## What Is Included

- Browser audio upload and recording
- DeepFilterNet speech enhancement
- WAV download of the cleaned result
- Production WSGI start command with Gunicorn
- Docker deployment with `ffmpeg` and `libsndfile`
- `/health` endpoint for platform health checks
- Render Blueprint config in `render.yaml`

## Local Development

1. Create and activate a virtual environment:

   ```bash
   python3.10 -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Install `ffmpeg` locally if you want MP3, WebM, M4A, or OGG conversion:

   ```bash
   brew install ffmpeg
   ```

4. Start the app:

   ```bash
   python3 app.py
   ```

5. Open:

   ```text
   http://127.0.0.1:5001
   ```

## Run Locally With Docker

1. Build the image:

   ```bash
   docker build -t vocalift .
   ```

2. Run the container:

   ```bash
   docker run --rm -p 10000:10000 -e SECRET_KEY=local-dev-secret vocalift
   ```

3. Open:

   ```text
   http://127.0.0.1:10000
   ```

## Deploy To Render

This repo is ready for a Docker-based Render Web Service. Docker is recommended because this app needs system packages for audio processing.

1. Push this project to GitHub.

2. In Render, choose **New > Blueprint** if you want Render to use `render.yaml`, or choose **New > Web Service** for manual setup.

3. Connect the GitHub repository.

4. If creating the service manually, use these settings:

   ```text
   Language: Docker
   Dockerfile path: ./Dockerfile
   Health check path: /health
   ```

5. Add environment variables:

   ```text
   SECRET_KEY=<generate a long random value>
   WEB_CONCURRENCY=1
   MAX_CONTENT_LENGTH=52428800
   ```

6. Deploy. The first deploy can take several minutes because PyTorch and DeepFilterNet are large dependencies.

7. After deployment, open the Render URL and test with a short WAV file first.

## Deploy To Any Docker Host

Use this option for Fly.io, Railway, a VPS, or another container platform.

1. Build the image:

   ```bash
   docker build -t vocalift .
   ```

2. Run it with a platform-provided `PORT`:

   ```bash
   docker run --rm -p 10000:10000 \
     -e PORT=10000 \
     -e SECRET_KEY="$(openssl rand -hex 32)" \
     -e WEB_CONCURRENCY=1 \
     vocalift
   ```

3. Configure your platform health check to:

   ```text
   /health
   ```

## Notes For Production

- Keep `WEB_CONCURRENCY=1` unless you have enough RAM for multiple DeepFilterNet model copies.
- Use short audio files on small instances. Long audio files are CPU and memory intensive.
- Increase `MAX_CONTENT_LENGTH` only if your hosting plan has enough memory and request timeout headroom.
- Do not commit generated files in `uploads/`, `outputs/`, or `deepfilternet/target/`.

## Supported Audio Formats

- Input: WAV, MP3, OGG, FLAC, M4A, WebM
- Output: WAV
