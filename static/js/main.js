document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadBox = document.getElementById('uploadBox');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const processBtn = document.getElementById('processBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const statusText = document.getElementById('statusText');
    const results = document.getElementById('results');
    const originalAudio = document.getElementById('originalAudio');
    const cleanedAudio = document.getElementById('cleanedAudio');
    const downloadBtn = document.getElementById('downloadBtn');
    const controls = document.getElementById('controls');

    // State
    let mediaRecorder;
    let audioChunks = [];
    let audioBlob = null;
    let audioUrl = null;
    let audioFile = null;
    let currentPreview = null;

    // Event Listeners
    uploadBox.addEventListener('click', () => {
        if (!audioFile) fileInput.click();
    });
    uploadBox.addEventListener('dragover', handleDragOver);
    uploadBox.addEventListener('dragleave', handleDragLeave);
    uploadBox.addEventListener('drop', handleDrop);
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!audioFile) fileInput.click();
    });
    fileInput.addEventListener('change', handleFileSelect);
    recordBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);
    processBtn.addEventListener('click', processAudio);
    downloadBtn.addEventListener('click', downloadAudio);

    // Functions
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadBox.style.borderColor = '#6366f1';
        uploadBox.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadBox.style.borderColor = '';
        uploadBox.style.backgroundColor = '';
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadBox.style.borderColor = '';
        uploadBox.style.backgroundColor = '';

        if (audioFile) {
            showError('Please delete the current audio before uploading a new one.');
            return;
        }

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleAudioFile(files[0]);
        }
    }

    function handleFileSelect(e) {
        if (audioFile) {
            showError('Please delete the current audio before uploading a new one.');
            return;
        }

        const file = e.target.files[0];
        if (file) {
            handleAudioFile(file);
        }
    }

    function handleAudioFile(file) {
        if (!file.type.startsWith('audio/')) {
            showError('Please select an audio file');
            return;
        }

        audioFile = file;
        audioUrl = URL.createObjectURL(file);
        showAudioPreview(audioUrl, file.type);
    }

    function showAudioPreview(url, type) {
        if (currentPreview) {
            currentPreview.remove();
        }

        const audioContainer = document.createElement('div');
        audioContainer.className = 'audio-preview';
        audioContainer.innerHTML = `
            <h3>Original Audio</h3>
            <audio controls>
                <source src="${url}" type="${type}">
                Your browser does not support the audio element.
            </audio>
            <button id="deleteAudio" class="delete-btn">Delete</button>
        `;

        uploadBox.parentNode.insertBefore(audioContainer, uploadBox.nextSibling);
        currentPreview = audioContainer;

        document.getElementById('deleteAudio').addEventListener('click', deleteAudio);

        showControls();
    }

    function deleteAudio() {
        if (currentPreview) {
            currentPreview.remove();
            currentPreview = null;
        }
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            audioUrl = null;
        }
        audioFile = null;
        audioBlob = null;
        results.classList.add('hidden');
        controls.classList.add('hidden');
        fileInput.value = '';
    }

    async function startRecording() {
        if (audioFile) {
            showError('Please delete the current audio before starting a new recording.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Prefer WAV recording if the browser supports it (Safari, some Chrome builds)
            const wavMime = 'audio/wav';
            const options = MediaRecorder.isTypeSupported(wavMime) ? { mimeType: wavMime } : {};
            mediaRecorder = new MediaRecorder(stream, options);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Use the type from the incoming chunks – this is often audio/webm or audio/ogg
                const mimeType = mediaRecorder.mimeType || audioChunks[0]?.type || 'audio/webm';
                audioBlob = new Blob(audioChunks, { type: mimeType });
                audioUrl = URL.createObjectURL(audioBlob);
                // Determine appropriate extension from mimeType
                const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : 'wav';
                audioFile = new File([audioBlob], `recording.${ext}`, { type: mimeType });

                showAudioPreview(audioUrl, 'audio/wav');
            };

            mediaRecorder.start();
            recordBtn.classList.add('hidden');
            recordingIndicator.classList.remove('hidden');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            showError('Could not access microphone. Please check permissions.');
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            recordingIndicator.classList.add('hidden');
            recordBtn.classList.remove('hidden');
        }
    }

    async function processAudio() {
        if (!audioFile) {
            showError('Please upload or record an audio file first');
            return;
        }

        const formData = new FormData();
        formData.append('audio', audioFile, audioFile.name || 'recording.wav');

        try {
            // Show loading state
            progressContainer.classList.remove('hidden');
            controls.classList.add('hidden');
            results.classList.add('hidden');
            cleanedAudio.innerHTML = '';
            
            updateProgress(10, 'Uploading audio...');

            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Failed to process audio');
            }

            updateProgress(50, 'Processing audio...');
            
            // Get the processed audio as a blob
            const blob = await response.blob();
            const processedUrl = URL.createObjectURL(blob);

            // ==== Populate cleaned audio ====
            // cleanedAudio is an <audio> tag already in the DOM
            cleanedAudio.innerHTML = '';
            const cleanedSrc = document.createElement('source');
            cleanedSrc.src = processedUrl;
            cleanedSrc.type = 'audio/wav';
            cleanedAudio.appendChild(cleanedSrc);

            // ==== Populate original audio (for side-by-side comparison) ====
            if (audioUrl) {
                originalAudio.innerHTML = '';
                const origSrc = document.createElement('source');
                origSrc.src = audioUrl; // global preview URL
                origSrc.type = audioFile?.type || 'audio/wav';
                originalAudio.appendChild(origSrc);
            }

            // Store for download
            window.processedBlob = blob;
            window.processedUrl = processedUrl;

            updateProgress(100, 'Processing complete!');
            
            // Show results
            setTimeout(() => {
                progressContainer.classList.add('hidden');
                results.classList.remove('hidden');
                controls.classList.remove('hidden');
                results.scrollIntoView({ behavior: 'smooth' });
                

            }, 500);

        } catch (error) {
            console.error('Error processing audio:', error);
            showError(`Error: ${error.message || 'Failed to process audio'}`);
            progressContainer.classList.add('hidden');
            controls.classList.remove('hidden');
        }
    }

    function downloadAudio() {
        if (!window.processedBlob) {
            showError('No processed audio available to download');
            return;
        }
        
        const a = document.createElement('a');
        a.href = window.processedUrl || URL.createObjectURL(window.processedBlob);
        a.download = `cleaned_${audioFile?.name?.replace(/\.[^/.]+$/, '') || 'recording'}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function showControls() {
        controls.classList.remove('hidden');
        controls.classList.add('fade-in');
    }

    function updateProgress(percent, message) {
        progressBar.style.width = `${percent}%`;
        statusText.textContent = message;
    }

    function showError(message) {
        alert(message);
    }

    window.addEventListener('beforeunload', () => {
        // Clean up object URLs
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        if (window.processedUrl) URL.revokeObjectURL(window.processedUrl);
        
        // Stop any active recording
        if (mediaRecorder?.state !== 'inactive') {
            mediaRecorder?.stop();
            mediaRecorder?.stream?.getTracks()?.forEach(track => track.stop());
        }
    });
});
