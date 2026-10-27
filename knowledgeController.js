
const { Knowledge, Comment } = require("../database/db");

exports.getPosts = async (req, res, next) => {
  try {
    const posts = await Knowledge.find()
      .populate("owner", "name avatar")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ posts });
  } catch (error) {
    next(error);
  }
};

exports.createPost = async (req, res, next) => {
  try {
    const title = typeof req.body.title === "string"
      ? req.body.title.trim() : "";
    const content = typeof req.body.content === "string"
      ? req.body.content.trim() : "";
    const tags = Array.isArray(req.body.tags) ? req.body.tags : [];

    if (!title || title.length > 160 || !content || content.length > 20000 ||
        tags.length > 20 || tags.some(t => typeof t !== "string" || t.length > 40)) {
      return res.status(400).json({ message: "Invalid post title, content, or tags." });
    }

    const post = await Knowledge.create({
      title, content, tags, owner: req.user._id
    });

    await post.populate("owner", "name avatar");
    res.status(201).json({ message: "Post published.", post });
  } catch (error) {
    next(error);
  }
};

exports.toggleLike = async (req, res, next) => {
  try {
    const post = await Knowledge.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const liked = post.likes.some(id => id.equals(req.user._id));

    if (liked) post.likes.pull(req.user._id);
    else post.likes.addToSet(req.user._id);

    await post.save();

    res.json({ liked: !liked, likesCount: post.likes.length });
  } catch (error) {
    next(error);
  }
};

exports.getComments = async (req, res, next) => {
  try {
    const post = await Knowledge.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const comments = await Comment.find({ post: post._id })
      .populate("owner", "name avatar")
      .sort({ createdAt: 1 });

    res.json({ comments });
  } catch (error) {
    next(error);
  }
};
