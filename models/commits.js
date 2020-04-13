const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const commitsSchema = new Schema(
  {
    commitID: String,
    commitMessage: String,
    commitURL: String,
    commitDate: String,
    projectName: String,
    authorName: String,
  },
  {
    timestamps: true,
  }
);

const Commits = mongoose.model("Commits", commitsSchema);

module.exports = Commits;
