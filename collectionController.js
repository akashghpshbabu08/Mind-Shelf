
const { Collection, Note } = require("../database/db");

exports.getCollections = async (req, res, next) => {
  try {
    const collections = await Collection.find({ owner: req.user._id })
      .populate("notes", "title subject updatedAt")
      .sort({ updatedAt: -1 });

    res.json({ collections });
  } catch (error) {
    next(error);
  }
};

exports.createCollection = async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string"
      ? req.body.name.trim() : "";
    const description = typeof req.body.description === "string"
      ? req.body.description.trim() : "";

    if (!name || name.length > 100 || description.length > 500) {
      return res.status(400).json({
        message: "Provide a collection name (1–100 characters) and description (up to 500)."
      });
    }

    const collection = await Collection.create({
      name,
      description,
      owner: req.user._id
    });

    res.status(201).json({ message: "Collection created.", collection });
  } catch (error) {
    next(error);
  }
};

exports.addNoteToCollection = async (req, res, next) => {
  try {
    const { noteId } = req.body;

    const [collection, note] = await Promise.all([
      Collection.findOne({ _id: req.params.id, owner: req.user._id }),
      Note.findOne({ _id: noteId, owner: req.user._id })
    ]);

    if (!collection) {
      return res.status(404).json({ message: "Collection not found." });
    }
    if (!note) {
      return res.status(404).json({ message: "Your note was not found." });
    }

    if (!collection.notes.some(id => id.equals(note._id))) {
      collection.notes.push(note._id);
      await collection.save();
    }

    await collection.populate("notes", "title subject updatedAt");
    res.json({ message: "Note added to collection.", collection });
  } catch (error) {
    next(error);
  }
};

exports.getCollectionNotes = async (req, res, next) => {
  try {
    const collection = await Collection.findOne({
      _id: req.params.id,
      owner: req.user._id
    }).populate("notes", "title subject content updatedAt");

    if (!collection) {
      return res.status(404).json({ message: "Collection not found." });
    }

    res.json({ collection, notes: collection.notes });
  } catch (error) {
    next(error);
  }
};

exports.deleteCollection = async (req, res, next) => {
  try {
    const collection = await Collection.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!collection) {
      return res.status(404).json({ message: "Collection not found." });
    }

    res.json({ message: "Collection deleted." });
  } catch (error) {
    next(error);
  }
};
