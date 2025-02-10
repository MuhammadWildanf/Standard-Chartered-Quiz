import ClientRouter from "./routes/clientRoute.js"
import MasterRouter from "./routes/masterRoute.js"
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from "cors"

const app = express();
const server = http.createServer(app);

// Mengizinkan koneksi dari client (misalnya React, Vue, atau Angular)
const io = new Server(server, {
    cors: {
        origin: "*", // Ganti dengan URL frontend jika diperlukan
        methods: ["GET", "POST"]
    }
});

app.use(express.static('views'));

app.use(cors());

app.use(ClientRouter)
app.use(MasterRouter)

const admins = {};

// Event ketika client terhubung
io.on("connection", (socket) => {
    console.log(`User terhubung: ${socket.id}`);

    const { userId, role } = socket.handshake.query;

    if (role === 'admin') {
        admins[userId] = socket.id; // Simpan userId sebagai admin
        console.log(`Admin ${userId} connected with socket ${socket.id}`);
    }

    socket.on('startQuiz', () => {
        if (role === 'admin') {
            console.log("admin has started the quiz")
            app.get('/', () => {
                
            })
        }
    })

    socket.on('disconnect', () => {
        if (role === 'admin') {
            console.log(`Admin ${userId} disconnected`);
            delete admins[userId]; // Hapus jika admin keluar
        }
    });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
