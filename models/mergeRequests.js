const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const MergeRequestSchema = new Schema(
  {
    mergeRequestID: String,
    state: String,
    title: String,
    description: String,
    taskID: String,
    taskProject: String,
    taskAssignee: String,
    taskReviewer: String,
    url: String,
  },
  {
    timestamps: true,
  }
);

const MergeRequests = mongoose.model("MergeRequests", MergeRequestSchema);

module.exports = MergeRequests;
