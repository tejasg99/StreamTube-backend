import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route("/register").post(
    // Middleware inserted before method(registerUser)
    upload.fields([
        // Two files, avatar and coverImage
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

export default router