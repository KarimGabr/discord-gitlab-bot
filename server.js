require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");
const app = express();
const http = require("http").Server(app);
const port = 4123;

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://localhost/discord_gitlab_bot", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Connected to MongoDB!");

  http.listen(port, () => {
    console.log("Listening to Port: " + port);
  });
});

let MergeRequests = require("./models/mergeRequests");

const Discord = require("discord.js");
const bot = new Discord.Client();

bot.commands = new Discord.Collection();
const botCommands = require("./commands");
Object.keys(botCommands).map((key) => {
  bot.commands.set(botCommands[key].name, botCommands[key]);
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
bot.login(DISCORD_TOKEN);
bot.on("ready", () => {
  console.log(`Logged in as ${bot.user.tag}!`);

  // get all text channels in server
  // and convert Map to Array
  // and make a new array of text channels only

  const server_swisodev = bot.guilds.cache.get(process.env.DISCORD_SERVER);
  const channels = Array.from(server_swisodev.channels.cache).reduce(
    (obj, [key, value]) => Object.assign(obj, { [key]: value }),
    {}
  );
  let related_channels = Object.keys(channels)
    .filter((key) => channels[key].type == "text")
    .map((key) => channels[key]);

  // periodically poll to the merge-requests api each 60s
  // save the merge-requests in the database
  // if any new id is coming within the GET request, send a notification

  const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
  const axios = require("axios");

  axios.interceptors.request.use((config) => {
    config = {
      ...config,
      headers: { "Private-Token": GITLAB_TOKEN },
    };
    return config;
  });

  setInterval(async () => {
    const now = new Date();
    const nowISO = now.toISOString();

    const apiRequest = await axios.get(
      `https://gitlab.com/api/v4/groups/${process.env.GITLAB_GROUP}/merge_requests?state=opened&updated_after=${nowISO}`
    );

    const _mergeRequests = apiRequest.data;

    _mergeRequests.map((mr) => {
      MergeRequests.findOneAndUpdate(
        { mergeRequestID: mr.id },
        {
          mergeRequestID: mr.id,
          state: mr.state,
          title: mr.title,
          description: mr.description,
          taskID: mr.source_branch,
          taskProject: mr.references.full.split("!")[0].split("/")[1],
          taskAssignee: mr.author.name,
          taskReviewer: mr.assignee.name,
          url: mr.web_url,
        },
        {
          returnOriginal: false,
          upsert: true,
        }
      ).then((doc) => {
        const _receipt_channel = related_channels.find(
          (channel) => channel.name === doc.taskProject
        );
        const _message = `:loudspeaker: Merge Request Update\n:information_source: State: ${doc.state}\n:atom_symbol: Project: ${doc.taskProject}\n:card_index: Task ID: ${doc.taskID}\n:abc: Title: "${doc.title}" \n:speech_balloon: Description: "${doc.description}" \n:keyboard: Task Assignee: ${doc.taskAssignee}\n:mag: Task Reviewer: ${doc.taskReviewer}\n:link: URL: ${doc.url} `;
        console.log(_message);
        _receipt_channel.send(_message);
      });
    });
  }, 60000);
});
