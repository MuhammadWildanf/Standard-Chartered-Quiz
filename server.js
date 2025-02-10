import ClientRouter from "./src/routes/clientRoute.js"
import MasterRouter from "./src/routes/masterRoute.js"
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from "cors"
import path from 'path'
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url'
import { teamName } from "./src/controller/clientController.js"

const app = express();
const server = http.createServer(app);


// Mengizinkan koneksi dari client (misalnya React, Vue, atau Angular)
const io = new Server(server, {
    cors: {
        origin: "*", // Ganti dengan URL frontend jika diperlukan
        methods: ["GET", "POST"]
    }
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname,  'public')));
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('view engine', 'ejs'); // Pastikan sudah diatur

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(ClientRouter)
app.use(MasterRouter)

const admins = {};

const users = {};

// Event ketika client terhubung
io.on("connection", (socket) => {
    const { userId, role } = socket.handshake.query;

    if (role === 'user') {
        users[userId] = socket.id;
        console.log(`Team ${userId} connected with socket ${socket.id}`);
    }

    socket.on("TeamJoined", (teamName) => {
        io.emit("TeamJoined", teamName)
    })

    if (role === 'admin') {
        admins[userId] = socket.id; // Simpan userId sebagai admin
        console.log(`Admin ${userId} connected with socket ${socket.id}`);
    }

    socket.on('startQuiz', () => {
        if (role === 'admin') {
            console.log("admin has started the quiz")
            io.emit('quizStarted')
        }
    })

    socket.on('disconnect', () => {
        if (role === 'admin') {
            console.log(`Admin ${userId} disconnected`);
            delete admins[userId]; // Hapus jika admin keluar
        } else {
            console.log(`User disconnected`);
            delete users[userId];
        }
    });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
