const socket = io();  // Assumes socket.io is loaded and available

// --- Voice Message Feature ---
const micBtn = document.getElementById('mic-btn');
const voiceModal = document.getElementById('voice-modal');
const sendVoiceBtn = document.getElementById('send-voice-btn');
const cancelVoiceBtn = document.getElementById('cancel-voice-btn');
const recordingTimer = document.getElementById('recording-timer');
let mediaRecorder, voiceChunks = [], recordingInterval, recordingStream;

micBtn.addEventListener('click', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice recording not supported in this browser.');
        return;
    }
    voiceChunks = [];
    try {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(recordingStream);
        mediaRecorder.ondataavailable = e => voiceChunks.push(e.data);
        mediaRecorder.onstop = () => {
            recordingStream.getTracks().forEach(track => track.stop());
        };
        mediaRecorder.start();
        voiceModal.style.display = 'block';
        startRecordingTimer();
    } catch (err) {
        alert('Microphone access denied.');
    }
});

sendVoiceBtn.onclick = async () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        stopRecordingTimer();
        mediaRecorder.onstop = async () => {
            const blob = new Blob(voiceChunks, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', blob);
            formData.append('timestamp', Date.now());
            formData.append('nickname', YOUR_NICKNAME);
            try {
                const res = await fetch('/upload_voice', { method: 'POST', body: formData });
                if (!res.ok) {
                    throw new Error(`Server error: ${res.status}`);
                }
                const data = await res.json();
                if (data.url) {
                    socket.emit('voice_message', {
                        url: data.url,
                        timestamp: data.timestamp,
                        nickname: YOUR_NICKNAME
                    });
                } else {
                    alert('Voice upload failed: no URL returned');
                }
            } catch (e) {
                alert('Voice upload failed: ' + e.message);
                console.error('Voice upload error:', e);
            }
            voiceModal.style.display = 'none';
        };
    }
};

cancelVoiceBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        stopRecordingTimer();
    }
    if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
    }
    voiceModal.style.display = 'none';
};

function startRecordingTimer() {
    let seconds = 0;
    recordingTimer.textContent = '00:00';
    recordingInterval = setInterval(() => {
        seconds++;
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        recordingTimer.textContent = `${m}:${s}`;
    }, 1000);
}

function stopRecordingTimer() {
    clearInterval(recordingInterval);
    recordingTimer.textContent = '00:00';
}

socket.on('new_voice_message', (data) => {
    appendVoiceMessage(data);
    scrollToBottom();
    if (data.nickname !== YOUR_NICKNAME) playNotificationSound();
});

function appendVoiceMessage(msg) {
    const messagesContainer = document.getElementById('messages');
    const msgEl = document.createElement('div');
    msgEl.classList.add('message', msg.nickname === YOUR_NICKNAME ? 'message-self' : 'message-other');

    const avatar = document.createElement('img');
    avatar.classList.add('message-avatar');
    avatar.src = msg.avatar || '/static/img/default-avatar.png';
    avatar.alt = `${msg.nickname}'s avatar`;

    const content = document.createElement('div');
    content.classList.add('message-content');

    const header = document.createElement('div');
    header.classList.add('message-header');

    const name = document.createElement('span');
    name.classList.add('message-nickname');
    name.textContent = msg.nickname;

    const time = document.createElement('span');
    time.classList.add('message-timestamp');
    time.textContent = msg.timestamp;

    header.appendChild(name);
    header.appendChild(time);

    // ** Reply preview for voice messages **
       if (msg.parent_preview) {
        const replyPreview = document.createElement('div');
        replyPreview.className = 'reply-preview';
        if (msg.nickname === YOUR_NICKNAME) {
            replyPreview.textContent = `↪ You replied to: ${msg.parent_preview}...`;
        } else {
            replyPreview.textContent = `↪ Replying to: ${msg.parent_preview}...`;
        }
        content.appendChild(replyPreview);
    }

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = msg.url;

    content.appendChild(header);
    content.appendChild(audio);

    msgEl.appendChild(avatar);
    msgEl.appendChild(content);

    messagesContainer.appendChild(msgEl);
}

// --- File Upload Feature (Photo/Video) ---
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*, video/*';
fileInput.style.display = 'none';
document.querySelector('.message-form').appendChild(fileInput);

document.getElementById('snap-btn').addEventListener('click', () => {
    fileInput.click();
});

// In media.js, update the file upload event listener to include reply support:

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('timestamp', Date.now());
    formData.append('nickname', YOUR_NICKNAME);

    try {
        const res = await fetch('/upload_file', { method: 'POST', body: formData });
        if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
        }
        const data = await res.json();
        if (data.url) {
            // Access reply variables from chat.js scope if they exist
            let parentId = null;
            if (typeof replyToMessageId !== 'undefined' && replyToMessageId) {
                parentId = replyToMessageId;
            }
            
            socket.emit('file_message', {
                url: data.url,
                timestamp: data.timestamp,
                nickname: YOUR_NICKNAME,
                parent_id: parentId
            });

            // Clear reply state if it exists
            if (typeof clearReplyPreview === 'function') {
                clearReplyPreview();
            }
        } else {
            alert('File upload failed: no URL returned');
        }
    } catch (e) {
        alert('File upload failed: ' + e.message);
        console.error('Upload error:', e);
    }
});
socket.on('new_file_message', (data) => {
    appendFileMessage(data);
    scrollToBottom();
    if (data.nickname !== YOUR_NICKNAME) playNotificationSound();
});

function appendFileMessage(data) {
    const messagesContainer = document.getElementById('messages');
    const msgEl = document.createElement('div');
    msgEl.className = `message ${data.nickname === YOUR_NICKNAME ? 'message-self' : 'message-other'}`;

    const avatar = document.createElement('img');
    avatar.classList.add('message-avatar');
    avatar.src = data.avatar || '/static/img/default-avatar.png';
    avatar.alt = `${data.nickname}'s avatar`;

    const content = document.createElement('div');
    content.classList.add('message-content');

    const header = document.createElement('div');
    header.classList.add('message-header');

    const name = document.createElement('span');
    name.classList.add('message-nickname');
    name.textContent = data.nickname;

    const time = document.createElement('span');
    time.classList.add('message-timestamp');
    time.textContent = data.timestamp;

    header.appendChild(name);
    header.appendChild(time);

    // ** Reply preview for file messages **
    if (data.parent_preview) {
        const replyPreview = document.createElement('div');
        replyPreview.className = 'reply-preview';
        if (data.nickname === YOUR_NICKNAME) {
            replyPreview.textContent = `↪ You replied to: ${data.parent_preview}...`;
        } else {
            replyPreview.textContent = `↪ Replying to: ${data.parent_preview}...`;
        }
        content.appendChild(replyPreview);
    }
    content.appendChild(header);

    // Inline display of image or video
    const fileUrl = data.url.toLowerCase();

    if (fileUrl.match(/\.(jpeg|jpg|png|gif)$/)) {
        const img = document.createElement('img');
        img.src = data.url;
        img.alt = 'Image attachment';
        img.style.maxWidth = '250px';
        img.style.borderRadius = '8px';
        content.appendChild(img);
    } else if (fileUrl.match(/\.(mp4|webm|ogg|mov)$/)) {
        const video = document.createElement('video');
        video.src = data.url;
        video.controls = true;
        video.style.maxWidth = '250px';
        video.style.borderRadius = '8px';
        content.appendChild(video);
    } else {
        const fileLink = document.createElement('a');
        fileLink.href = data.url;
        fileLink.target = '_blank';
        fileLink.rel = 'noopener noreferrer';
        fileLink.textContent = '📎 File attachment';
        content.appendChild(fileLink);
    }

    msgEl.appendChild(avatar);
    msgEl.appendChild(content);
    messagesContainer.appendChild(msgEl);
}

// Helper function to scroll messages container to bottom
function scrollToBottom() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
    });
}
