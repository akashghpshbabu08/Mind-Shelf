const router = require("express").Router();
const controller = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { signupRules, loginRules } = require("../validators/authValidator");

router.post("/signup", signupRules, controller.signup);
router.post("/login", loginRules, controller.login);
router.get("/me", protect, controller.me);
router.patch("/profile", protect, controller.updateProfile);

module.exports = router;