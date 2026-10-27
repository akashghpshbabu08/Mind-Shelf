const { body } = require("express-validator");

const resourceRules = [
  body("title").trim().notEmpty().withMessage("Title is required.")
    .isLength({ max: 160 }),
  body("description").optional().isString().isLength({ max: 2000 }),
  body("subject").optional().isString().isLength({ max: 100 }),
  body("type").optional().isIn([
    "notes", "pdf", "document", "link", "video", "other"
  ]),
  body("url").optional({ values: "falsy" }).isURL({
    protocols: ["http", "https"],
    require_protocol: true
  }).withMessage("URL must start with http:// or https://"),
  body("tags").optional().isArray({ max: 20 }),
  body("tags.*").optional().isString().isLength({ max: 40 })
];

module.exports = { resourceRules };
