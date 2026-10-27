const router = require("express").Router();
const controller = require("../controllers/noteController");
const { protect } = require("../middleware/authMiddleware");
const { noteRules } = require("../validators/noteValidator");

router.use(protect);
router.get("/", controller.getNotes);
router.post("/", noteRules, controller.createNote);
router.patch("/:id", controller.updateNote);
router.delete("/:id", controller.deleteNote);

module.exports = router;