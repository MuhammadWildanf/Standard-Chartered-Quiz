import { teamNames } from "../../globalState.js"; // Import dari file yang sama dengan server.js

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

export const validateTeamName = (req, res, next) => {
  const { teamName } = req.body;

  if (!teamName) {
    return res.render("client/form.ejs", {
      title: "Client",
      errorMessage: "Nama tim wajib diisi",
    });
  }

  if (teamNames.has(teamName)) {
    return res.render("client/form.ejs", {
      title: "Client",
      errorMessage: "Nama tim sudah digunakan, pilih nama lain.",
    });
  }

  next(); // Lanjut ke handler berikutnya
};

export const teamName = (req, res) => {
  const { teamName } = req.body;

  teamNames.add(teamName);
  req.session.teamName = teamName;
  res.redirect(`/quiz/${teamName}`);
};


export const updateTeams = (req, res) => {
  const { teamName } = req.body;

  teamNames.delete(teamName);
};
