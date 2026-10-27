const router = require("express").Router();
const knowledge = require("../controllers/knowledgeController");
const comments = require("../controllers/commentController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, knowledge.getPosts);
router.post("/", protect, knowledge.createPost);
router.post("/:id/like", protect, knowledge.toggleLike);
router.get("/:id/comments", protect, knowledge.getComments);
router.post("/:id/comments", protect, comments.createComment);
router.delete("/:id/comments/:commentId", protect, comments.deleteComment);

module.exports = router;
