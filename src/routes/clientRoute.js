import express from "express"
import { home, quiz, teamName } from "../controller/clientController.js"

const router = express.Router()

router.get('/', home)
router.get('/quiz/:teamName', quiz)
router.post('/quiz', teamName)

export default router