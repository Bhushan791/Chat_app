document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const messagesContainer = document.getElementById('messages');
    const usersList = document.getElementById('users-list');
    const emojiBtn = document.getElementById('emoji-btn');
    const muteBtn = document.getElementById('mute-btn');
    let soundMuted = false;

    // Your nickname from server-side template (set in chat.html using tojson)
    // Example: <script>const YOUR_NICKNAME = {{ nickname|tojson }};</script>
    // Example: <script>const IS_ADMIN = {{ 'true' if is_admin else 'false' }};</script>

    // Notification sound setup
    const notificationAudio = new Audio('/static/sounds/notification.mp3'); // Place your mp3 here!
    notificationAudio.volume = 0.5;

    function playNotificationSound() {
        if (!soundMuted) {
            notificationAudio.currentTime = 0;
            notificationAudio.play();
        }
    }

    // Mute/unmute button logic
    muteBtn.addEventListener('click', () => {
        soundMuted = !soundMuted;
        muteBtn.innerHTML = soundMuted
            ? '<i class="fas fa-volume-mute"></i>'
            : '<i class="fas fa-volume-up"></i>';
    });

    // Emoji picker setup (assuming emoji-picker.js is loaded)
    let emojiPicker;
    if (typeof EmojiPicker !== 'undefined') {
        emojiPicker = new EmojiPicker({
            trigger: [emojiBtn],
            position: 'top-start',
            onEmojiSelected: (emoji) => {
                messageInput.value += emoji;
                messageInput.focus();
            }
        });
        emojiPicker.discover();
    }

    socket.emit('join');

    socket.on('chat_history', (history) => {
        messagesContainer.innerHTML = '';
        history.forEach(msg => appendMessage(msg));
        scrollToBottom();
    });

    socket.on('new_message', (msg) => {
        appendMessage(msg);
        scrollToBottom();
        if (msg.nickname !== YOUR_NICKNAME) {
            playNotificationSound();
        }
    });

    socket.on('user_list', (users) => {
        usersList.innerHTML = '';
        users.forEach(user => {
            const li = document.createElement('li');
            li.classList.add('user-item');

            const avatar = document.createElement('img');
            avatar.classList.add('user-avatar');
            avatar.src = user.avatar || '/static/img/default-avatar.png';
            avatar.alt = `${user.nickname}'s avatar`;

            const name = document.createElement('span');
            name.classList.add('user-name');
            name.textContent = user.nickname;

            li.appendChild(avatar);
            li.appendChild(name);
            usersList.appendChild(li);
        });

        if (typeof IS_ADMIN !== "undefined" && IS_ADMIN) {
            updateAdminPanel(users);
        }
    });

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = messageInput.value.trim();
        if (!msg) return;
        socket.emit('send_message', { message: msg });
        messageInput.value = '';
        messageInput.focus();

        // Optional: subtle send animation
        const sendBtn = document.querySelector('.send-btn');
        sendBtn.classList.add('sending');
        setTimeout(() => {
            sendBtn.classList.remove('sending');
        }, 300);
    });

    socket.on('kicked', () => {
        alert('You have been kicked by the admin.');
        window.location.href = '/';
    });

    socket.on('muted', () => {
        alert('You have been muted by the admin. You cannot send messages.');
        messageInput.disabled = true;
        messageForm.classList.add('muted');
    });

    socket.on('unmuted', () => {
        alert('You have been unmuted by the admin. You can send messages now.');
        messageInput.disabled = false;
        messageForm.classList.remove('muted');
        messageInput.focus();
    });

    // Typing indicator logic
    let typingTimeout;
    messageInput.addEventListener('input', () => {
        socket.emit('typing', { isTyping: true });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('typing', { isTyping: false });
        }, 1000);
    });

    socket.on('user_typing', (data) => {
        const typingIndicator = document.getElementById('typing-indicator');
        if (data.isTyping && data.nickname !== YOUR_NICKNAME) {
            typingIndicator.textContent = `${data.nickname} is typing...`;
            typingIndicator.style.display = 'block';
        } else {
            typingIndicator.style.display = 'none';
        }
    });

    // Message rendering (left/right)
    function appendMessage(msg) {
        const msgEl = document.createElement('div');
        msgEl.classList.add('message');
        if (msg.nickname === YOUR_NICKNAME) {
            msgEl.classList.add('message-self');
        } else {
            msgEl.classList.add('message-other');
        }

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

        const text = document.createElement('p');
        text.classList.add('message-text');
        text.innerHTML = processMessageText(msg.message);

        content.appendChild(header);
        content.appendChild(text);

        msgEl.appendChild(avatar);
        msgEl.appendChild(content);

        messagesContainer.appendChild(msgEl);
    }

    // Process message text for links and emojis
    function processMessageText(text) {
        // First escape HTML to prevent XSS
        const escapedText = escapeHtml(text);
        // Convert URLs to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return escapedText.replace(urlRegex, url => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    }

    function scrollToBottom() {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function updateAdminPanel(users) {
        const adminList = document.getElementById('admin-users-list');
        if (!adminList) return;
        adminList.innerHTML = '';
        users.forEach(user => {
            const li = document.createElement('li');
            li.classList.add('admin-user-item');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = user.nickname;
            if (user.nickname.toLowerCase() === 'admin') {
                li.appendChild(nameSpan);
            } else {
                const kickBtn = document.createElement('button');
                kickBtn.textContent = 'Kick';
                kickBtn.classList.add('kick-btn');
                kickBtn.onclick = () => {
                    if (confirm(`Are you sure you want to kick ${user.nickname}?`)) {
                        socket.emit('admin_kick', { nickname: user.nickname });
                    }
                };
                const muteBtn = document.createElement('button');
                muteBtn.textContent = 'Mute';
                muteBtn.classList.add('mute-btn');
                muteBtn.onclick = () => {
                    socket.emit('admin_mute', { nickname: user.nickname });
                };
                const unmuteBtn = document.createElement('button');
                unmuteBtn.textContent = 'Unmute';
                unmuteBtn.classList.add('unmute-btn');
                unmuteBtn.onclick = () => {
                    socket.emit('admin_unmute', { nickname: user.nickname });
                };
                li.appendChild(nameSpan);
                li.appendChild(kickBtn);
                li.appendChild(muteBtn);
                li.appendChild(unmuteBtn);
            }
            adminList.appendChild(li);
        });
    }
});
