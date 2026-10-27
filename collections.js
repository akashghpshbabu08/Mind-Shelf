const router = require("express").Router();
const controller = require("../controllers/collectionController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);
router.get("/", controller.getCollections);
router.post("/", controller.createCollection);
router.get("/:id/notes", controller.getCollectionNotes);
router.post("/:id/notes", controller.addNoteToCollection);
router.delete("/:id", controller.deleteCollection);

module.exports = router;