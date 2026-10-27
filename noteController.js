
const { validationResult } = require("express-validator");
const { Note } = require("../database/db");

exports.getNotes = async (req, res, next) => {
  try {
    const filter = { owner: req.user._id };

    if (req.query.archived === "true") filter.isArchived = true;
    if (req.query.archived === "false") filter.isArchived = false;

    const notes = await Note.find(filter).sort({ updatedAt: -1 });
    res.json({ notes });
  } catch (error) {
    next(error);
  }
};

exports.createNote = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, subject = "", tags = [] } = req.body;

    const note = await Note.create({
      title,
      content,
      subject,
      tags,
      owner: req.user._id
    });

    res.status(201).json({ message: "Note created.", note });
  } catch (error) {
    next(error);
  }
};

exports.updateNote = async (req, res, next) => {
  try {
    const allowed = ["title", "content", "subject", "tags", "isArchived", "favorite"];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (req.body.archived !== undefined && req.body.isArchived === undefined) {
      updates.isArchived = Boolean(req.body.archived);
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ message: "Note not found." });
    }

    res.json({ message: "Note updated.", note });
  } catch (error) {
    next(error);
  }
};

exports.deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found." });
    }

    res.json({ message: "Note deleted." });
  } catch (error) {
    next(error);
  }
};
