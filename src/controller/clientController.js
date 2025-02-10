export const home = (req, res) => {
    res.render("client/wait.ejs", {title : "Client"});
};

export const quiz = (req, res) => {
    const name = req.params.teamName
    res.render("client/index.ejs", {title : "Quiz", namatim : name});
};

export const teamName = (req, res) => {
    const { teamName } = req.body;

    if (!teamName) {
        return res.status(400).json({ error: "Nama tim wajib diisi" });
    }

    res.redirect(`/quiz/${teamName}`)
}