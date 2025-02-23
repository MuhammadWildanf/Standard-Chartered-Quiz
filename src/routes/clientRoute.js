import express from "express"
import { home, quiz, validateTeamName, teamName, updateTeams } from "../controller/clientController.js"

const router = express.Router()

router.get('/', home)
router.get('/quiz/:teamName', quiz)
router.post('/quiz', teamName , validateTeamName)
router.post('/updatetim', updateTeams)

export default router