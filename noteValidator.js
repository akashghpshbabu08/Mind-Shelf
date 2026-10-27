const { body } = require("express-validator");

const noteRules = [
  body("title").trim().notEmpty().withMessage("Title is required.")
    .isLength({ max: 160 }),
  body("content").isString().trim().notEmpty()
    .withMessage("Note content is required.")
    .isLength({ max: 100000 }),
  body("subject").optional().isString().isLength({ max: 100 }),
  body("tags").optional().isArray({ max: 20 }),
  body("tags.*").optional().isString().isLength({ max: 40 })
];

module.exports = { noteRules };
