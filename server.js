import dotenv from "dotenv";
import ClientRouter from "./src/routes/clientRoute.js"
import MasterRouter from "./src/routes/masterRoute.js"
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from "cors"
import path from 'path'
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url'
import session from "express-session";
import { teamName } from "./src/controller/clientController.js"

dotenv.config();
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
app.use(
    session({
      secret: "secret-key", // Ganti dengan secret key yang aman
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }, // Set true jika menggunakan HTTPS
    })
);
  
const teamNames = new Set();

app.use(ClientRouter)
app.use(MasterRouter)

const admins = {};
let users = {};

// Event ketika client terhubung
io.on("connection", (socket) => {
    const { userId, role } = socket.handshake.query;

    if (teamNames.has(userId)) {
        console.log(`Team ${userId} sudah digunakan`);
        socket.emit("teamNameExists", "Nama tim sudah digunakan, pilih nama lain.");
        return;
    }

    if (role === 'user') {
        users[userId] = { id: socket.id, name: userId, fund: 1000000 };
        console.log(`Team ${userId} connected with socket ${socket.id}`);

        io.emit("updateTeams", users);
    }

    if (role === 'admin') {
        admins[userId] = socket.id;
        console.log(`Admin ${userId} connected with socket ${socket.id}`);
    }

    socket.on('startQuiz', () => {
        if (role === 'admin') {
            console.log("Admin has started the quiz");
            io.emit('quizStarted');
        }
    });

    socket.on('disconnect', () => {
        if (role === 'admin') {
            console.log(`Admin ${userId} disconnected`);
            delete admins[userId];
        } else {
            console.log(`User ${userId} disconnected`);

            if (users[userId]) {
                io.emit("TeamLeave", users[userId].name);
                delete users[userId];
            }

            if (users[userId]) {
                io.emit("TeamLeave", users[userId].name);
                teamNames.delete(userId); // Hapus nama tim dari daftar saat keluar
                delete users[userId];
            }
        }
    });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
