import express from "express"
import { home } from "../controller/hostController.js"

const router = express.Router()

router.get('/leaderboard', home)

export default router