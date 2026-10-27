const { Knowledge, Comment } = require("../database/db");

exports.createComment = async (req, res, next) => {
  try {
    const content = typeof req.body.content === "string"
      ? req.body.content.trim() : "";

    if (!content || content.length > 2000) {
      return res.status(400).json({
        message: "Comment must contain 1–2000 characters."
      });
    }

    const post = await Knowledge.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const comment = await Comment.create({
      content,
      post: post._id,
      owner: req.user._id
    });

    await comment.populate("owner", "name avatar");
    res.status(201).json({ message: "Comment added.", comment });
  } catch (error) {
    next(error);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findOneAndDelete({
      _id: req.params.commentId,
      owner: req.user._id
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    res.json({ message: "Comment deleted." });
  } catch (error) {
    next(error);
  }
};