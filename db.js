
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ["student", "teacher", "admin"],
    default: "student"
  },
  avatar: { type: String, default: "" }
}, { timestamps: true });

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  subject: { type: String, default: "", trim: true, maxlength: 100 },
  content: { type: String, required: true, maxlength: 100000 },
  tags: [{ type: String, trim: true, maxlength: 40 }],
  isArchived: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

const collectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: "", maxlength: 500 },
  notes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Note" }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: "", maxlength: 2000 },
  subject: { type: String, default: "", maxlength: 100 },
  type: {
    type: String,
    enum: ["notes", "pdf", "document", "link", "video", "other"],
    default: "other"
  },
  url: { type: String, default: "" },
  tags: [{ type: String, trim: true, maxlength: 40 }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

const knowledgeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  content: { type: String, required: true, maxlength: 20000 },
  tags: [{ type: String, trim: true, maxlength: 40 }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Knowledge",
    required: true
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Note = mongoose.models.Note || mongoose.model("Note", noteSchema);
const Collection = mongoose.models.Collection ||
  mongoose.model("Collection", collectionSchema);
const Resource = mongoose.models.Resource ||
  mongoose.model("Resource", resourceSchema);
const Knowledge = mongoose.models.Knowledge ||
  mongoose.model("Knowledge", knowledgeSchema);
const Comment = mongoose.models.Comment ||
  mongoose.model("Comment", commentSchema);

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from .env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");
}

module.exports = {
  connectDB,
  User,
  Note,
  Collection,
  Resource,
  Knowledge,
  Comment
};
