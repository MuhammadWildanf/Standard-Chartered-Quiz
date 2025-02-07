import express from 'express'
import bodyParser from 'body-parser'
import ClientRouter from "./routes/clientRoute.js"
import MasterRouter from "./routes/masterRoute.js"
import { WebSocketServer } from "ws";

const app = express();

const server = new WebSocketServer({ port: 8080 });

app.use(express.static('views'))

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

app.use(ClientRouter)
app.use(MasterRouter)

app.use(express.json())

app.use(bodyParser.json());

