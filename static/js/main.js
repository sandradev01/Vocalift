document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadBox = document.getElementById('uploadBox');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const noiseReduction = document.getElementById('noiseReduction');
    const sliderValue = document.getElementById('sliderValue');
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

    // Event Listeners
    uploadBox.addEventListener('click', () => fileInput.click());
    uploadBox.addEventListener('dragover', handleDragOver);
    uploadBox.addEventListener('drop', handleDrop);
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    fileInput.addEventListener('change', handleFileSelect);
    recordBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);
    noiseReduction.addEventListener('input', updateSliderValue);
    processBtn.addEventListener('click', processAudio);
    downloadBtn.addEventListener('click', downloadAudio);

    // Initialize
    updateSliderValue();

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
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleAudioFile(files[0]);
        }
    }

    function handleFileSelect(e) {
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
        originalAudio.src = audioUrl;
        showControls();
    }

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                audioUrl = URL.createObjectURL(audioBlob);
                originalAudio.src = audioUrl;
                audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
                showControls();
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

    function updateSliderValue() {
        sliderValue.textContent = `${noiseReduction.value}%`;
    }

    async function processAudio() {
        if (!audioFile) {
            showError('Please upload or record an audio file first');
            return;
        }

        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('strength', noiseReduction.value / 100);

        try {
            // Show progress
            progressContainer.classList.remove('hidden');
            controls.classList.add('hidden');
            results.classList.add('hidden');
            updateProgress(10, 'Uploading audio...');

            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            updateProgress(50, 'Processing audio with DeepFilterNet...');

            // Handle the response (assuming it's the processed audio file)
            const blob = await response.blob();
            const processedUrl = URL.createObjectURL(blob);
            cleanedAudio.src = processedUrl;

            // Save the blob for download
            window.processedBlob = blob;

            updateProgress(100, 'Processing complete!');
            setTimeout(() => {
                progressContainer.classList.add('hidden');
                results.classList.remove('hidden');
                results.classList.add('fade-in');
            }, 500);

        } catch (error) {
            console.error('Error processing audio:', error);
            showError('An error occurred while processing the audio. Please try again.');
            progressContainer.classList.add('hidden');
            controls.classList.remove('hidden');
        }
    }

    function downloadAudio() {
        if (!window.processedBlob) {
            showError('No processed audio available to download');
            return;
        }

        const url = URL.createObjectURL(window.processedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cleaned_${new Date().getTime()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
        // You can implement a more sophisticated error display
        alert(message);
    }

    // Handle window unload
    window.addEventListener('beforeunload', () => {
        // Clean up
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    });
});
