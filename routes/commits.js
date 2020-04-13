const router = require("express").Router();
let Commits = require("../models/commits");

router.route("/").get((req, res) => {
  Commits.find()
    .then((ls) => res.json(ls))
    .catch((err) => res.status(400).json("Error: " + err));
});

router.route("/:id").get((req, res) => {
  Commits.findById(req.params.id)
    .then((ls) => res.json(ls))
    .catch((err) => res.status(400).json("Error: " + err));
});

router.route("/add").post((req, res) => {
  const staffID = req.body.staffID;
  const isOnline = req.body.isOnline;

  const Commits = new Commits({ staffID, isOnline });

  Commits.save()
    .then(() => res.json("Login Status Added!"))
    .catch((err) => res.status(400).json("Error: " + err));
});

router.route("/update/:id").post((req, res) => {
  Commits.findById(req.params.id)
    .then((ls) => {
      ls.staffID = req.body.staffID;
      ls.isOnline = req.body.isOnline;

      ls.save()
        .then(() => res.json("Login Status Updated!"))
        .catch((err) => res.status(400).json("Error: " + err));
    })
    .catch((err) => res.status(400).json("Error: " + err));
});

router.route("/delete_all").delete((req, res) => {
  Commits.remove()
    .then(() => res.json("Collection Deleted!"))
    .catch((err) => res.status(400).json("Error: " + err));
});

router.route("/:id").delete((req, res) => {
  Commits.findByIdAndDelete(req.params.id)
    .then(() => res.json("Login Status Deleted!"))
    .catch((err) => res.status(400).json("Error: " + err));
});

module.exports = router;
