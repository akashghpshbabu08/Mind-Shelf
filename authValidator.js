const { body } = require("express-validator");

const signupRules = [
  body("name").trim().notEmpty().withMessage("Name is required.")
    .isLength({ max: 80 }),
  body("email").trim().isEmail().withMessage("Enter a valid email.")
    .normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8–128 characters.")
];

const loginRules = [
  body("email").trim().isEmail().withMessage("Enter a valid email.")
    .normalizeEmail(),
  body("password").isString().notEmpty().withMessage("Password is required.")
];

module.exports = { signupRules, loginRules };
