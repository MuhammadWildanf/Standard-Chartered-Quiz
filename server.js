import "dotenv/config";
import dotenv from "dotenv";
import ClientRouter from "./src/routes/clientRoute.js";
import MasterRouter from "./src/routes/masterRoute.js";
import HostRouter from "./src/routes/hostRoute.js";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import session from "express-session";
import fs from "fs";

dotenv.config();
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const URL = process.env.URL;

// Mengizinkan koneksi dari client (misalnya React, Vue, atau Angular)
const io = new Server(server, {
  cors: {
    origin: "*", // Ganti dengan URL frontend jika diperlukan
    methods: ["GET", "POST"],
  },
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "src", "views"));
app.set("view engine", "ejs"); // Pastikan sudah diatur

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

app.use(ClientRouter);
app.use(MasterRouter);
app.use(HostRouter);

const admins = {};
let users = {};
let hosts = {};
let votes = {};
let questions = [];
try {
  questions = JSON.parse(fs.readFileSync("question1.json", "utf-8"));
} catch (error) {
  console.error("Error reading questions:", error);
}

// Event ketika client terhubung
io.on("connection", (socket) => {
  const { userId, role } = socket.handshake.query;

  if (role === "user") {
    users[userId] = { id: socket.id, name: userId, fund: 1000000 };
    console.log(`Team ${userId} connected with socket ${socket.id}`);

    io.emit("updateTeams", users);
  }

  if (role === "admin") {
    admins[userId] = socket.id;
    console.log(`Admin ${userId} connected with socket ${socket.id}`);
  }

  if (role === "host") {
    hosts[userId] = socket.id;
    console.log(`Host ${userId} connected with socket ${socket.id}`);
  }

  socket.on("getQuestion", (index) => {
    if (index < questions.length) {
      io.emit("question", questions[index]);
    } else {
      io.emit("end");
    }
  });

  socket.on("getQuestionInleaderboard", (index) => {
    if (index < questions.length) {
      io.emit("questioninLeaderboard", questions[index]);
    } else {
      io.emit("endinLeaderboard");
    }
  });

  socket.on("vote", ({ teamName, option }) => {
    // Tambahkan atau perbarui jumlah vote
    votes[option] = (votes[option] || 0) + 1;

    // Kirim pembaruan jumlah vote ke semua client
    io.emit("updateVotes", votes);
  });

  socket.on("updatefund", ({ teamName, amount }) => {
    if (users[teamName]) {
      // users[teamName].fund += amount;
      users[teamName].fund = amount;
      console.log(`Dana tim ${teamName} diperbarui menjadi: S${amount}`);
      io.emit("updateTeams", users);
    }
  });

  socket.on("startQuiz", () => {
    if (Object.keys(users).length < 30) {
      socket.emit("startFailed", "Minimal 30 tim harus bergabung.");
      console.log("Tidak cukup tim untuk memulai kuis.");
      return;
    }
  
    console.log("Quiz Started!");
    io.emit("quizStarted");
  });

  socket.on("disconnect", () => {
    if (role === "admin") {
      console.log(`Admin ${userId} disconnected`);
      delete admins[userId];
    } else {
      if (users[userId]) {
        io.emit("TeamLeave", users[userId].name);
        console.log(`User ${userId} disconnected`);
        delete users[userId];
      }
    }
  });

});

// Jalankan server
server.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
