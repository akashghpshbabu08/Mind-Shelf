
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { User } = require("../database/db");

function issueToken(user) {
  return jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar
  };
}

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "student"
    });

    res.status(201).json({
      message: "Account created successfully.",
      token: issueToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({
      email: email.toLowerCase().trim()
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    res.json({
      message: "Login successful.",
      token: issueToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res) => {
  res.json({ user: publicUser(req.user) });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const updates = {};

    if (typeof req.body.name === "string") {
      const name = req.body.name.trim();
      if (!name || name.length > 80) {
        return res.status(400).json({ message: "Name must be 1–80 characters." });
      }
      updates.name = name;
    }

    if (typeof req.body.avatar === "string") {
      if (req.body.avatar.length > 500) {
        return res.status(400).json({ message: "Avatar URL is too long." });
      }
      updates.avatar = req.body.avatar;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ message: "Profile updated.", user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};
