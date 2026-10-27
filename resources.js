const router = require("express").Router();
const controller = require("../controllers/resourceController");
const { protect } = require("../middleware/authMiddleware");
const { resourceRules } = require("../validators/resourceValidator");

router.use(protect);

router.get("/", controller.getResources);
router.get("/bookmarks", controller.getBookmarks);
router.post("/", resourceRules, controller.createResource);
router.post("/:id/bookmark", controller.toggleBookmark);
router.patch("/:id", controller.updateResource);
router.delete("/:id", controller.deleteResource);

module.exports = router;