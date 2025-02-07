// Membuat koneksi WebSocket ke server
const socket = new WebSocket('ws://localhost:8080');

// Menangani event saat koneksi berhasil
socket.addEventListener('open', () => {
    console.log('Connected to WebSocket server');
});

// Menangani event ketika menerima pesan dari server
socket.addEventListener('message', (event) => {
    const messagesDiv = document.getElementById('messages');
    const message = document.createElement('p');
    message.textContent = `Server: ${event.data}`;
    messagesDiv.appendChild(message);
});

// Menangani event ketika koneksi ditutup
socket.addEventListener('close', () => {
    console.log('Disconnected from WebSocket server');
});

// Menangani error
socket.addEventListener('error', (error) => {
    console.log(`WebSocket Error: ${error}`);
});