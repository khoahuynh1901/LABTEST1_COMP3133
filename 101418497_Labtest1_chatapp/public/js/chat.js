const socket = io();

// Get username and room from URL params
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');
const room = urlParams.get('room');

if (username && room) {
    socket.emit('joinRoom', { username, room });
}

// Listen for incoming messages
socket.on('message', (data) => {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('p');
    messageElement.textContent = `${data.username}: ${data.text}`;
    chatBox.appendChild(messageElement);
});
  
// Send message
document.getElementById('send-btn').addEventListener('click', () => {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value;

    if (message) {
        socket.emit('chatMessage', { username, message, room });
        messageInput.value = '';
    }
});
