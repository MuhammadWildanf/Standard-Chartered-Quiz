export const home = (req, res) => {
  res.render("client/wait.ejs", { title: "Client" });
};

export const quiz = (req, res) => {
  const name = req.params.teamName;
  res.render("client/index.ejs", { title: "Quiz", namatim: name });
};

const teamNames = new Set();
export const teamName = (req, res) => {
  const { teamName } = req.body;

  if (!teamName) {
    return res.render("client/wait.ejs", { 
      title: "Client", 
      errorMessage: "Nama tim wajib diisi" 
    });
  }

  if (teamNames.has(teamName)) {
    return res.render("client/wait.ejs", {
      title: "Client",
      errorMessage: "Nama tim sudah digunakan, pilih nama lain.",
    });
  }

  teamNames.add(teamName); // Simpan nama tim

  res.redirect(`/quiz/${teamName}`);
};
