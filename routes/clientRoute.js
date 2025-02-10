import express from "express"
import { home } from "../controller/clientController.js"

const router = express.Router()

router.get('/', home)

export default router