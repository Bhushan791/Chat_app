// ✅ Put these at the very top of chat.js (outside any function or block)
let replyToMessageId = null;
let replyToMessageContent = null;

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const messagesContainer = document.getElementById('messages');
    const usersList = document.getElementById('users-list');
    const emojiBtn = document.getElementById('emoji-btn');
    const muteBtn = document.getElementById('mute-btn');
    let soundMuted = false;

    // Reply state variables
    const replyPreviewContainer = document.createElement('div');
    replyPreviewContainer.className = 'reply-preview-container';
    messageForm.insertBefore(replyPreviewContainer, messageInput);

// *** Added these two lines here ***
replyPreviewContainer.style.display = 'none';
replyPreviewContainer.textContent = '';

    

    // Notification sound setup
    const notificationAudio = new Audio('/static/sounds/notification.mp3');
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

       // ===== ENHANCED EMOJI PICKER SETUP =====
    const emojiPickerContainer = document.getElementById('emoji-picker-container');
    const emojiPickerContent = document.getElementById('emoji-picker-content');
    const emojiPickerClose = document.getElementById('emoji-picker-close');

    // Comprehensive emoji collection organized by categories
    const emojiCategories = {
        'Smileys & People': [
            '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
        ],
        'Animals & Nature': [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'
        ],
        'Food & Drink': [
            '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾'
        ],
        'Activities & Sports': [
            '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘', '🧘‍♂️', '🏄‍♀️', '🏄', '🏄‍♂️', '🏊‍♀️', '🏊', '🏊‍♂️', '🤽‍♀️', '🤽', '🤽‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🤹‍♀️', '🤹‍♂️', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🥁', '🪘', '🎹', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'
        ],
        'Travel & Places': [
            '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚀', '🛰️', '🚉', '🚊', '🚝', '🚞', '🚋', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚨', '🚥', '🚦', '🛑', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🛕', '🕍', '🕋', '⛩️', '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌌', '🌉', '🌁'
        ],
        'Objects & Symbols': [
            '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🪚', '🔫', '🧨', '💣', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪣', '🧽', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📅', '📆', '📇', '🗃️', '🗳️', '🗄️', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📝', '✏️', '✒️', '🖋️', '🖊️', '🖌️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'
        ]
    };

    // Create emoji picker content
    function createEmojiPicker() {
        emojiPickerContent.innerHTML = '';
        
        Object.entries(emojiCategories).forEach(([category, emojis]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'emoji-category';
            
            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'emoji-category-title';
            categoryTitle.textContent = category;
            categoryDiv.appendChild(categoryTitle);
            
            const emojiGrid = document.createElement('div');
            emojiGrid.className = 'emoji-grid';
            
            emojis.forEach(emoji => {
                const emojiSpan = document.createElement('span');
                emojiSpan.className = 'emoji-item';
                emojiSpan.textContent = emoji;
                emojiSpan.title = emoji;
                emojiSpan.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    insertEmojiAtCursor(emoji);
                    // DON'T close the picker here - let user select multiple emojis
                });
                emojiGrid.appendChild(emojiSpan);
            });
            
            categoryDiv.appendChild(emojiGrid);
            emojiPickerContent.appendChild(categoryDiv);
        });
    }

    // Insert emoji at cursor position and maintain focus
    function insertEmojiAtCursor(emoji) {
        // Store current cursor position
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        const text = messageInput.value;
        
        // Insert emoji
        messageInput.value = text.substring(0, start) + emoji + text.substring(end);
        
        // Restore cursor position after emoji
        const newCursorPosition = start + emoji.length;
        messageInput.selectionStart = messageInput.selectionEnd = newCursorPosition;
        
        // ALWAYS maintain focus on message input
        messageInput.focus();
        
        // Add a subtle animation to the emoji button to show selection
        emojiBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            emojiBtn.style.transform = 'scale(1)';
        }, 150);
    }

    // Show emoji picker and maintain focus
    function showEmojiPicker() {
        emojiPickerContainer.style.display = 'block';
        emojiPickerContainer.style.animation = 'emojiPickerSlideIn 0.3s ease-out';
        emojiBtn.classList.add('emoji-btn-active');
        
        // Ensure message input stays focused
        setTimeout(() => {
            messageInput.focus();
        }, 50);
    }

    // Hide emoji picker and restore focus to message input
    function hideEmojiPicker() {
        emojiPickerContainer.style.animation = 'emojiPickerSlideOut 0.3s ease-out';
        emojiBtn.classList.remove('emoji-btn-active');
        
        setTimeout(() => {
            emojiPickerContainer.style.display = 'none';
            // ALWAYS restore focus to message input when closing
            messageInput.focus();
        }, 300);
    }

    // Emoji button click handler
    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (emojiPickerContainer.style.display === 'none' || !emojiPickerContainer.style.display) {
            showEmojiPicker();
        } else {
            hideEmojiPicker();
        }
    });

    // Close button handler with focus restoration
    emojiPickerClose.addEventListener('click', (e) => {
        e.stopPropagation();
        hideEmojiPicker();
    });

    // Prevent picker from closing when clicking inside it, but maintain focus
    emojiPickerContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        // Ensure focus stays on message input even when clicking inside picker
        messageInput.focus();
    });

    // Click outside to close (but not when clicking inside the picker)
    document.addEventListener('click', (e) => {
        if (!emojiPickerContainer.contains(e.target) && e.target !== emojiBtn) {
            hideEmojiPicker();
        }
    });

    // Ensure focus is maintained when scrolling in emoji picker
    emojiPickerContent.addEventListener('scroll', () => {
        messageInput.focus();
    });

    // Initialize emoji picker
    createEmojiPicker();

    // ===== END EMOJI PICKER SETUP =====
    
    // ✅ UPDATED: Show reply preview with 15 character limit
    function showReplyPreview(text) {
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '×';
        cancelBtn.title = 'Cancel reply';
        cancelBtn.onclick = () => {
            clearReplyPreview();
        };
        
        const replyText = document.createElement('div');
        replyText.className = 'reply-text';
        
        // ✅ TRUNCATE MESSAGE TO 15 CHARACTERS WITH ELLIPSIS
        let displayText = text;
        if (text.length > 15) {
            // Find the last space within 15 characters to avoid cutting words
            let truncateAt = 15;
            let lastSpace = text.lastIndexOf(' ', 15);
            
            // If there's a space within the first 15 characters, cut there
            if (lastSpace > 0 && lastSpace < 15) {
                truncateAt = lastSpace;
            }
            
            displayText = text.substring(0, truncateAt).trim() + '...';
        }
        
        replyText.textContent = displayText;
        
        replyPreviewContainer.innerHTML = '';
        replyPreviewContainer.appendChild(replyText);
        replyPreviewContainer.appendChild(cancelBtn);
        replyPreviewContainer.style.display = 'flex';
    }
    
    // Clear reply state and hide preview
    function clearReplyPreview() {
        replyToMessageId = null;
        replyToMessageContent = null;
        replyPreviewContainer.style.display = 'none';
        replyPreviewContainer.textContent = '';
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

    // **Revised submit handler with reply support and bug fix**
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const msg = messageInput.value.trim();
        if (!msg) return;

        // Store reply info before clearing
        const currentReplyId = replyToMessageId;
        
        // Emit message with reply info
        socket.emit('send_message', {
            message: msg,
            parent_id: currentReplyId
        });

        // Clear input and reply state after storing the reply info
        messageInput.value = '';
        if (currentReplyId) {
            clearReplyPreview();
        }
        messageInput.focus();

        // Optional subtle send animation
        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn) {
            sendBtn.classList.add('sending');
            setTimeout(() => {
                sendBtn.classList.remove('sending');
            }, 300);
        }
    });

    // Add direct Enter key handler for the input field
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
            const msg = messageInput.value.trim();
            if (!msg) return;

            // Store reply info before clearing
            const currentReplyId = replyToMessageId;
            
            // Emit message with reply info
            socket.emit('send_message', {
                message: msg,
                parent_id: currentReplyId
            });

            // Clear input and reply state after storing the reply info
            messageInput.value = '';
            if (currentReplyId) {
                clearReplyPreview();
            }
            messageInput.focus();

            // Optional subtle send animation
            const sendBtn = document.querySelector('.send-btn');
            if (sendBtn) {
                sendBtn.classList.add('sending');
                setTimeout(() => {
                    sendBtn.classList.remove('sending');
                }, 300);
            }
        }
    });

    socket.on('kicked', () => {
        alert('You have been kicked by the admin.');
        window.location.href = '/';
    });

    socket.on('muted', () => {
        alert('You have been muted by the admin. You cannot send messages or upload media.');
        messageInput.disabled = true;
        messageForm.classList.add('muted');

        // Disable all send-related buttons
        emojiBtn.disabled = true;
        document.getElementById('mic-btn').disabled = true;
        document.getElementById('snap-btn').disabled = true;
        document.querySelector('.send-btn').disabled = true;
    });

    socket.on('unmuted', () => {
        alert('You have been unmuted by the admin. You can send messages now.');
        messageInput.disabled = false;
        messageForm.classList.remove('muted');

        // Enable all send-related buttons
        emojiBtn.disabled = false;
        document.getElementById('mic-btn').disabled = false;
        document.getElementById('snap-btn').disabled = false;
        document.querySelector('.send-btn').disabled = false;

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

    // Append text message with reply button and preview
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

        // Reply button
        const replyBtn = document.createElement('button');
        replyBtn.className = 'reply-btn';
        replyBtn.textContent = 'Reply';
        replyBtn.title = 'Reply to this message';
        replyBtn.onclick = () => {
            replyToMessageId = msg.id;
            replyToMessageContent = msg.message || '[Media]';
            showReplyPreview(replyToMessageContent);
            messageInput.focus();
        };
        header.appendChild(replyBtn);

        content.appendChild(header);

        // Add reply preview inside message if exists
        if (msg.parent_preview) {
            const replyPreview = document.createElement('div');
            replyPreview.className = 'reply-preview';
            if (msg.nickname === YOUR_NICKNAME) {
                replyPreview.textContent = `↪ You replied to: ${msg.parent_preview}...`;
            } else {
                replyPreview.textContent = `↪ Replied to: ${msg.parent_preview}...`;
            }
            content.appendChild(replyPreview);
        }

        const text = document.createElement('p');
        text.classList.add('message-text');
        text.innerHTML = processMessageText(msg.message);

        content.appendChild(text);

        msgEl.appendChild(avatar);
        msgEl.appendChild(content);

        messagesContainer.appendChild(msgEl);
    }

    // Append media message with reply button and preview
    function appendMediaMessage(data) {
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

        // Reply button
        const replyBtn = document.createElement('button');
        replyBtn.className = 'reply-btn';
        replyBtn.textContent = 'Reply';
        replyBtn.title = 'Reply to this message';
        replyBtn.onclick = () => {
            replyToMessageId = data.id || null;
            replyToMessageContent = '[Media]';
            showReplyPreview(replyToMessageContent);
            messageInput.focus();
        };
        header.appendChild(replyBtn);

        content.appendChild(header);

        // Add reply preview inside message if exists
        if (data.parent_preview) {
            const replyPreview = document.createElement('div');
            replyPreview.className = 'reply-preview';
            replyPreview.textContent = `↪ Replying to: ${data.parent_preview}...`;
            content.appendChild(replyPreview);
        }

        // Show inline media
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
        } else if (fileUrl.match(/\.(mp3|wav|webm)$/)) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = data.url;
            content.appendChild(audio);
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

    // Process message text for links and emojis
    function processMessageText(text) {
        const escapedText = escapeHtml(text);
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



    // theme
    // Admin panel update function
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
                kickBtn.textContent = '🦵';
                kickBtn.classList.add('kick-btn');
                kickBtn.onclick = () => {
                    if (confirm(`Are you sure you want to kick ${user.nickname}?`)) {
                        socket.emit('admin_kick', { nickname: user.nickname });
                    }
                };
                const muteBtn = document.createElement('button');
                muteBtn.textContent = '🔇';
                muteBtn.classList.add('mute-btn');
                muteBtn.onclick = () => {
                    socket.emit('admin_mute', { nickname: user.nickname });
                };
                const unmuteBtn = document.createElement('button');
                unmuteBtn.textContent = '🔊';
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