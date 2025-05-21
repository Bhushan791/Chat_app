document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const messagesContainer = document.getElementById('messages');
    const usersList = document.getElementById('users-list');
    const emojiBtn = document.getElementById('emoji-btn');

    // Your nickname passed from server-side template
    const YOUR_NICKNAME = "{{ nickname|escapejs }}";
    

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

    // Notify server that user joined
    socket.emit('join');

    // Load chat history
    socket.on('chat_history', (history) => {
        messagesContainer.innerHTML = '';
        history.forEach(msg => appendMessage(msg));
        scrollToBottom();
    });

    // New message received
    socket.on('new_message', (msg) => {
        appendMessage(msg);
        scrollToBottom();
        
        // Play notification sound for others' messages
        if (msg.nickname !== YOUR_NICKNAME) {
            playNotificationSound();
        }
    });

    // Update online users list
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

        if (IS_ADMIN) {
            updateAdminPanel(users);
        }
    });

    // Send message on form submit
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = messageInput.value.trim();
        if (!msg) return;
        
        socket.emit('send_message', { message: msg });
        messageInput.value = '';
        messageInput.focus();
        
        // Add subtle sending animation
        const sendBtn = document.querySelector('.send-btn');
        sendBtn.classList.add('sending');
        setTimeout(() => {
            sendBtn.classList.remove('sending');
        }, 300);
    });

    // Handle user kicked by admin
    socket.on('kicked', () => {
        alert('You have been kicked by the admin.');
        window.location.href = '/';
    });

    // Handle user muted by admin
    socket.on('muted', () => {
        alert('You have been muted by the admin. You cannot send messages.');
        messageInput.disabled = true;
        messageForm.classList.add('muted');
    });

    // Handle user unmuted by admin
    socket.on('unmuted', () => {
        alert('You have been unmuted by the admin. You can send messages now.');
        messageInput.disabled = false;
        messageForm.classList.remove('muted');
        messageInput.focus();
    });

    // Append a message to chat container with proper left/right alignment
    function appendMessage(msg) {
        const msgEl = document.createElement('div');
        msgEl.classList.add('message');

        // Add class for own messages or others
        if (msg.nickname === YOUR_NICKNAME) {
            msgEl.classList.add('message-self');
        } else {
            msgEl.classList.add('message-other');
        }

        const avatar = document.createElement('img');
        avatar.classList.add('message-avatar');
        avatar.src = msg.avatar || '/static/img/default-avatar.png';
        avatar.alt = `${msg.nickname}'s avatar`;
        avatar.onerror = () => {
            avatar.src = '/static/img/default-avatar.png';
        };

        const content = document.createElement('div');
        content.classList.add('message-content');

        const header = document.createElement('div');
        header.classList.add('message-header');

        const name = document.createElement('span');
        name.classList.add('message-nickname');
        name.textContent = msg.nickname;

        const time = document.createElement('span');
        time.classList.add('message-timestamp');
        time.textContent = formatTimestamp(msg.timestamp);

        header.appendChild(name);
        header.appendChild(time);

        const text = document.createElement('p');
        text.classList.add('message-text');
        
        // Process message text for links and emojis
        const processedText = processMessageText(msg.message);
        text.innerHTML = processedText;

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
        const textWithLinks = escapedText.replace(urlRegex, url => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
        
        return textWithLinks;
    }

    // Format timestamp to a more readable format
    function formatTimestamp(timestamp) {
        // If timestamp is in ISO format or similar, you can format it here
        // For now, just return as is
        return timestamp;
    }

    // Scroll chat to bottom with smooth animation
    function scrollToBottom() {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Play notification sound for new messages
    function playNotificationSound() {
        // Create and play a notification sound
        // This is commented out but could be implemented with a sound file
        /*
        const audio = new Audio('/static/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play();
        */
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Admin panel user list with controls
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
                kickBtn.title = 'Remove user from chat';
                kickBtn.onclick = () => {
                    if (confirm(`Are you sure you want to kick ${user.nickname}?`)) {
                        socket.emit('admin_kick', { nickname: user.nickname });
                    }
                };

                const muteBtn = document.createElement('button');
                muteBtn.textContent = 'Mute';
                muteBtn.classList.add('mute-btn');
                muteBtn.title = 'Prevent user from sending messages';
                muteBtn.onclick = () => {
                    socket.emit('admin_mute', { nickname: user.nickname });
                };

                const unmuteBtn = document.createElement('button');
                unmuteBtn.textContent = 'Unmute';
                unmuteBtn.classList.add('unmute-btn');
                unmuteBtn.title = 'Allow user to send messages';
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
    
    // Add typing indicator functionality
    let typingTimeout;
    messageInput.addEventListener('input', () => {
        if (!typingTimeout) {
            socket.emit('typing', { isTyping: true });
        }
        
        clearTimeout(typingTimeout);
        
        typingTimeout = setTimeout(() => {
            socket.emit('typing', { isTyping: false });
            typingTimeout = null;
        }, 1000);
    });
    
    // Handle typing indicators from other users
    socket.on('user_typing', (data) => {
        const typingIndicator = document.getElementById('typing-indicator') || createTypingIndicator();
        
        if (data.isTyping && data.nickname !== YOUR_NICKNAME) {
            typingIndicator.textContent = `${data.nickname} is typing...`;
            typingIndicator.style.display = 'block';
        } else {
            typingIndicator.style.display = 'none';
        }
    });
    
    // Create typing indicator element
    function createTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.classList.add('typing-indicator');
        messagesContainer.parentNode.insertBefore(indicator, messagesContainer.nextSibling);
        return indicator;
    }
});