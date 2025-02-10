const socket = io('http://localhost:3000', {
    query: {
        userId: 'admin123',  // ID tetap
        role: 'admin'
    }
});


const startQuiz = () => {
    socket.emit('startQuiz')
}