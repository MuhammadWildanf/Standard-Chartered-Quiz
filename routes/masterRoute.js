import express from "express"
import {
    home
} from "../controllers/masterController.js"
const router = express.Router()

router.get('/master', home)

export default router