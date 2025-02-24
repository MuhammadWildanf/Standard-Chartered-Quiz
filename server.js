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
const PORT = process.env.PORT || 443;
const URL = process.env.URL;

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "src", "views"));
app.set("view engine", "ejs");

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

const teamNames = new Set();
let admins = {};
let users = {};
let hosts = {};
let votes = {};

let questions = [];
let TieBreakerQuestions = [];

try {
  questions = JSON.parse(fs.readFileSync("question1.json", "utf-8"));
} catch (error) {
  console.error("Error reading questions:", error);
}

try {
  TieBreakerQuestions = JSON.parse(fs.readFileSync("question2.json", "utf-8"));
} catch (error) {
  console.error("Error reading TieBreakerQuestions:", error);
}

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

  // start first quiz
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
      io.emit("updateVotes", votes); // Pastikan frontend juga tahu vote direset
      io.emit("totalVotes", 0); // Reset total votes
    } else {
      io.emit("endinLeaderboard");
    }
  });

  socket.on("resetVotes", () => {
    votes = {}; // Reset votes di server
    io.emit("updateVotes", votes);
    io.emit("totalVotes", 0);
  });

  socket.on("vote", ({ teamName, option }) => {
    // Tambahkan atau perbarui jumlah vote
    votes[option] = (votes[option] || 0) + 1;

    // Hitung total vote dari semua opsi
    const totalVotes = Object.values(votes).reduce(
      (acc, curr) => acc + curr,
      0
    );

    // Kirim pembaruan jumlah vote ke semua client
    io.emit("updateVotes", votes);
    io.emit("totalVotes", totalVotes); // Kirim total vote juga
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
    if (Object.keys(users).length < 1) {
      socket.emit("startFailed", "Minimal 30 tim harus bergabung.");
      console.log("Tidak cukup tim untuk memulai kuis.");
      return;
    }
    console.log("Quiz Started!");
    io.emit("quizStarted");
  });

  // end first quiz

  // start tiebreaker question

  socket.on("getQuestion2", (index) => {
    if (index < TieBreakerQuestions.length) {
      io.emit("questiontie", TieBreakerQuestions[index]);
    } else {
      io.emit("endtie");
    }
  });

  socket.on("getQuestion2Inleaderboard", (index) => {
    if (index < TieBreakerQuestions.length) {
      console.log("questionTieinLeaderboard");
      io.emit("questionTieinLeaderboard", TieBreakerQuestions[index]);
      io.emit("updateVotes", votes); // Pastikan frontend juga tahu vote direset
      io.emit("totalVotes", 0); // Reset total votes
    } else {
      console.log("endTieinLeaderboard");
      io.emit("endTieinLeaderboard");
    }
  });

  socket.on("startTieBreakerQuiz", () => {
    console.log("Tie breaker question Started!");

    io.emit("TiebreakerStarted");

    if (TieBreakerQuestions.length > 0) {
      io.emit("questiontie", TieBreakerQuestions[0]);
    } else {
      console.log("Tidak ada pertanyaan tie-breaker.");
    }
  });

  socket.on("updatepoint", ({ teamName, correct, timeTaken, maxTime }) => {
    if (!users[teamName]) {
      users[teamName] = { point: 0 };
    }

    if (isNaN(users[teamName].point)) {
      users[teamName].point = 0; // Pastikan nilai awal adalah angka
    }

    let basePoint = correct ? 100 : 0;
    let timeBonus =
      correct && timeTaken !== undefined && maxTime !== undefined
        ? Math.max((maxTime - timeTaken) * 10, 0)
        : 0;

    let totalPoint = basePoint + timeBonus;

    console.log(
      `Tim: ${teamName}, Correct: ${correct}, Time Taken: ${timeTaken}, Max Time: ${maxTime}, Total Point: ${totalPoint}`
    );

    users[teamName].point += totalPoint;

    console.log(
      `Poin tim ${teamName} diperbarui menjadi: ${users[teamName].point}`
    );

    io.emit("updateTeams", users);
  });

  socket.on("timeUp", ({ questionId, teamName }) => {
    console.log(
      `Waktu habis untuk tim ${teamName} pada pertanyaan ${questionId}`
    );

    let maxTime =
      TieBreakerQuestions.find((q) => q.id === questionId)?.durations || 10; // Default 10 detik jika tidak ada

    socket.emit("updatepoint", {
      teamName,
      correct: false, // Tidak benar karena waktu habis
      timeTaken: maxTime,
      maxTime,
    });

    socket.emit("disableOptions", { teamName });
  });

  // end tiebreaker question

  socket.on("resetGame", () => {
    console.log("Game di-reset oleh admin");

    // Reset variabel game tanpa memutuskan koneksi socket
    votes = {};
    teamNames.clear();

    // Kirim event pembaruan ke semua klien
    io.emit("gameReset", { message: "Game telah di-reset!" });
  });

  socket.on("disconnect", (reason) => {
    if (role === "admin") {
      console.log(`Admin ${userId} disconnected: ${reason}`);
      delete admins[userId];
    } else if (role === "host") {
      console.log(`Host ${userId} disconnected: ${reason}`);
      delete hosts[userId];
    } else if (users[userId]) {
      io.emit("TeamLeave", users[userId].name);
      console.log(`User ${userId} disconnected: ${reason}`);

      // Hapus dari users dan teamNames
      teamNames.delete(users[userId].name);
      delete users[userId];
    }
  });
});

// Jalankan server
server.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
