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

const teamNames = new Set();
export const teamName = (req, res) => {
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

  teamNames.add(teamName); // Simpan nama tim
  req.session.teamName = teamName; // Simpan di session
  res.redirect(`/quiz/${teamName}`);
};

export const updateTeams = (req, res) => {
  const { teamName } = req.body

  teamNames.delete(teamName)
}
