document.addEventListener('DOMContentLoaded', () => {
    // Create and insert the emoji picker element but keep it hidden initially
    const emojiBtn = document.getElementById('emoji-btn');
    const messageInput = document.getElementById('message-input');

    // Create emoji-picker element
    const picker = document.createElement('emoji-picker');
    picker.style.position = 'absolute';
    picker.style.bottom = '60px'; // Adjust position above input area
    picker.style.left = '10px';
    picker.style.display = 'none';
    picker.style.zIndex = '1000';
    document.body.appendChild(picker);

    // Toggle picker visibility when emoji button clicked
    emojiBtn.addEventListener('click', () => {
        if (picker.style.display === 'none') {
            picker.style.display = 'block';
        } else {
            picker.style.display = 'none';
        }
    });

    // When an emoji is selected, insert it into the message input
    picker.addEventListener('emoji-click', event => {
        const emoji = event.detail.unicode;
        // Insert emoji at cursor position
        insertAtCursor(messageInput, emoji);
        messageInput.focus();
        picker.style.display = 'none';
    });

    // Helper function to insert emoji at cursor position in input/textarea
    function insertAtCursor(input, textToInsert) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        input.value = text.substring(0, start) + textToInsert + text.substring(end);
        input.selectionStart = input.selectionEnd = start + textToInsert.length;
    }

    // Hide picker if clicking outside
    document.addEventListener('click', (e) => {
        if (!picker.contains(e.target) && e.target !== emojiBtn) {
            picker.style.display = 'none';
        }
    });
});
