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

const io = new Server(server, {
  cors: {
    origin: "*",
    // origin: "scpvbportfoliogame.com",
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

function getTopTeams() {
  const data = JSON.parse(fs.readFileSync("data.json", 'utf-8'));
  const teamsArray = Object.values(data);

  // Urutkan berdasarkan fund (dari yang tertinggi)
  teamsArray.sort((a, b) => b.fund - a.fund);

  // Ambil 5 tim teratas 
  return teamsArray.slice(0, 5); //ganti 5 atau berapapun 
}

function getSocketIdByTeam(teamName) {
  let socketId = null;

  // Loop semua socket yang terhubung
  for (let [id, socket] of io.sockets.sockets) {
    if (socket.teamName === teamName) {
      socketId = id;
      break;
    }
  }

  return socketId;
}

io.on("connection", (socket) => {
  const { userId, role } = socket.handshake.query;

  if (role === "user") {
    users[userId] = { id: socket.id, name: userId, fund: 1000000 };
    socket.teamName = userId;
    console.log(`Team ${userId} connected with socket ${socket.id}`);
    updateData(users)
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
      updateData(users)
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
      io.to("tie-breaker").emit("endtie");
    }
  });

  socket.on("getQuestion2Inleaderboard", (index) => {
    if (index < TieBreakerQuestions.length) {
      // console.log("questionTieinLeaderboard");
      io.emit("questionTieinLeaderboard", TieBreakerQuestions[index]);
      io.emit("updateVotes", votes); // Pastikan frontend juga tahu vote direset
      io.emit("totalVotes", 0); // Reset total votes
    } else {
      console.log("endTieinLeaderboard");
      io.to("tie-breaker").emit("endTieinLeaderboard");
    }
  });

  socket.on("startTieBreakerQuiz", () => {
    console.log("Tie breaker question Started!");

    let top5team = getTopTeams();

    top5team.forEach(team => {
      let socketId = getSocketIdByTeam(team.name);
      if (socketId) {
        console.log(`✅ ${team.name} (${socketId}) masuk tie-breaker`);
        let socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.join("tie-breaker");
        } else {
          console.log(`⚠️ Socket ${socketId} tidak ditemukan untuk tim ${team.name}`);
        }
      } else {
        console.log(`⚠️ Tidak bisa menemukan socket untuk tim ${team.name}`);
      }
    });

    let clients = io.sockets.adapter.rooms.get("tie-breaker");
    console.log("👥 Clients dalam room tie-breaker:", clients ? [...clients] : "Tidak ada");

    io.to("tie-breaker").emit("TiebreakerStarted");

    if (TieBreakerQuestions.length > 0) {
      console.log("📢 Mengirim pertanyaan pertama tie-breaker...");
      io.to("tie-breaker").emit("questiontie", TieBreakerQuestions[0]);
    } else {
      console.log("Tidak ada pertanyaan tie-breaker.");
    }
  });


  socket.on("updatepoint", ({ teamName, correct, timeTaken, maxTime, point }) => {
    if (!users[teamName]) {
      users[teamName] = { point: 0 };
    }

    if (isNaN(users[teamName].point)) {
      users[teamName].point = 0; // Pastikan nilai awal adalah angka
    }

    // 🛠 **Langsung gunakan point dari client**
    let totalPoint = point;

    console.log(
      `Tim: ${teamName}, Correct: ${correct}, Time Taken: ${timeTaken}, Max Time: ${maxTime}, Total Point: ${totalPoint}`
    );

    // 🛠 **Update point team dengan nilai dari client**
    users[teamName].point = totalPoint;

    console.log(`Poin tim ${teamName} diperbarui menjadi: ${users[teamName].point}`);

    updateData(users)

    // Emit update ke semua client
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

    users = {}

    updateData(users)

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


const updateData = (data) => {
  fs.writeFileSync('data.json', JSON.stringify(data, null, 4), 'utf8');
}

// Jalankan server
server.listen(PORT, () => {
  console.log(`Server berjalan di https://localhost:${PORT}`);
  // console.log(`Server berjalan di http://192.168.88.116:${PORT}`);
});
