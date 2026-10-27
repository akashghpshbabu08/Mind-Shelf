const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const { Note, Collection, Resource } = require("../database/db");

router.get("/summary", protect, async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [notes, collections, resources] = await Promise.all([
      Note.countDocuments({ owner: userId }),
      Collection.countDocuments({ owner: userId }),
      Resource.countDocuments({
        $or: [{ owner: userId }, { bookmarks: userId }]
      })
    ]);

    res.json({
      stats: {
        notes,
        collections,
        resources
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
