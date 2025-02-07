const cors = require('cors')
const express = require('express')
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


server.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        console.log(`Received: ${message}`);
        ws.send(`Server: ${message}`);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log('WebSocket server running on ws://localhost:8080');

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: 'https://infocomm-bangkok-default-rtdb.asia-southeast1.firebasedatabase.app'
//   });

app.use(express.static(path.join(__dirname, 'views')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
app.use(express.json())

app.use(bodyParser.json());

app.use(cors({ origin: true }));
