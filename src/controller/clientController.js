import { teamNames } from "../../globalState.js"; // Import dari file yang sama dengan server.js
import path from "path";
import fs, { read } from "fs";
import { fileURLToPath } from 'url';

// Gantilah __dirname dengan kode ini
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const readData = () => {
  const filePath = path.join(__dirname, '../../data.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData);
}

export const home = (req, res) => {
  res.render("client/form.ejs", { title: "Client" });
};

export const quiz = (req, res) => {
  const name = req.params.teamName;
  // Cek apakah nama tim ada di session
  if (!req.session.teamName || req.session.teamName !== name) {
    return res.redirect("/"); // Redirect ke halaman utama jika akses tidak sah
  }
  res.render("client/wait.ejs", { title: "Quiz", namatim: name });
};

export const teamName = (req, res) => {
  const { teamName } = req.body;

  const data = readData()

  if (data.hasOwnProperty(teamName)) {
    return res.render("client/form.ejs", {
      title: "Client",
      errorMessage: "The team name is already in use",
    });
  }

  teamNames.add(teamName);
  req.session.teamName = teamName;
  res.redirect(`/quiz/${teamName}`);
};


export const updateTeams = (req, res) => {
  const { teamName } = req.body;

  teamNames.delete(teamName);
};
