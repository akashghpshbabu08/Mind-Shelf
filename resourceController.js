
const { validationResult } = require("express-validator");
const { Resource } = require("../database/db");

exports.getResources = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.type) filter.type = req.query.type;

    if (req.query.q) {
      const q = req.query.q.trim().slice(0, 100);
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } }
      ];
    }

    const resources = await Resource.find(filter)
      .populate("owner", "name")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ resources });
  } catch (error) {
    next(error);
  }
};

exports.createResource = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description = "", subject = "", type = "other",
      url = "", tags = [] } = req.body;

    const resource = await Resource.create({
      title, description, subject, type, url, tags, owner: req.user._id
    });

    res.status(201).json({ message: "Resource shared.", resource });
  } catch (error) {
    next(error);
  }
};

exports.toggleBookmark = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found." });
    }

    const alreadySaved = resource.bookmarks.some(id =>
      id.equals(req.user._id)
    );

    if (alreadySaved) {
      resource.bookmarks.pull(req.user._id);
    } else {
      resource.bookmarks.addToSet(req.user._id);
    }

    await resource.save();

    res.json({
      message: alreadySaved ? "Bookmark removed." : "Resource bookmarked.",
      bookmarked: !alreadySaved
    });
  } catch (error) {
    next(error);
  }
};

exports.getBookmarks = async (req, res, next) => {
  try {
    const resources = await Resource.find({
      bookmarks: req.user._id
    }).populate("owner", "name").sort({ updatedAt: -1 });

    res.json({ resources });
  } catch (error) {
    next(error);
  }
};

exports.updateResource = async (req, res, next) => {
  try {
    const allowed = ["title", "description", "subject", "type", "url", "tags"];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!resource) {
      return res.status(404).json({ message: "Resource not found." });
    }

    res.json({ message: "Resource updated.", resource });
  } catch (error) {
    next(error);
  }
};

exports.deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!resource) {
      return res.status(404).json({ message: "Resource not found." });
    }

    res.json({ message: "Resource deleted." });
  } catch (error) {
    next(error);
  }
};
