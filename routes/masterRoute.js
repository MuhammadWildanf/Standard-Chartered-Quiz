import express from "express"
import { home } from "../controller/masterController.js"

const router = express.Router()

router.get('/master', home)

export default router