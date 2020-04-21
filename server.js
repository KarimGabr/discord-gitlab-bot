require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");
const app = express();
const http = require("http").Server(app);
const port = 4445;

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://localhost/discord_gitlab_bot", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Connected to MongoDB! BECKY LEMME SMASH!");

  http.listen(port, () => {
    console.log("Listening to Port: " + port);
  });
});

mongoose.set("useFindAndModify", false);

const commitsRouter = require("./routes/commits");
app.use("/commits", commitsRouter);
let Commits = require("./models/commits");

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
  console.info(`Logged in as ${bot.user.tag}!`);

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

  // periodically poll to the commits api each 60s
  // save the commits in the database
  // if any new id is coming within the GET request, send a notification

  const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
  const axios = require("axios");
  const instance = axios.create({});

  instance.interceptors.request.use((config) => {
    config = {
      ...config,
      headers: { "Private-Token": GITLAB_TOKEN },
    };
    return config;
  });

  const intervalID = setInterval(function () {
    instance
      .get(
        `https://gitlab.com/api/v4/groups/${process.env.GITLAB_GROUP}/projects?include_subgroups=true`
      )
      .then((res) => {
        res.data.map((project) => {
          instance
            .get(
              `https://gitlab.com/api/v4/projects/${project.id}/repository/branches`
            )
            .then((res) => {
              res.data.map((branch) => {
                instance
                  .get(
                    `https://gitlab.com/api/v4/projects/${project.id}/repository/commits?ref_name=${branch.name}`
                  )
                  .then((res) => {
                    res.data.map((commit) => {
                      Commits.findOne({ commitID: commit.id }).then((doc) => {
                        if (!doc) {
                          Commits.create({
                            commitID: commit.id,
                            commitMessage: commit.title,
                            commitURL: commit.web_url,
                            commitDate: commit.committed_date,
                            projectName: project.name,
                            authorName: commit.author_name,
                          }).then(() => {
                            const _receipt_channel = related_channels.find(
                              (channel) =>
                                channel.name === project.namespace.name
                            );
                            const _message = `:loudspeaker: New Commit\n:classical_building: Project: ${project.name}\n:keyboard: By: ${commit.author_name}\n:newspaper: Message: "${commit.title}" \n:link: URL: ${commit.web_url} `;
                            console.log(_message);
                            _receipt_channel.send(_message);
                          });
                        }
                      });
                    });
                  });
              });
            });
        });
      });
  }, 60000);
});

bot.on("message", (msg) => {
  const args = msg.content.split(/ +/);
  const command = args.shift().toLowerCase();
  console.info(`Called command: ${command}`);

  if (!bot.commands.has(command)) return;

  try {
    bot.commands.get(command).execute(msg, args);
  } catch (error) {
    console.error(error);
    msg.reply("there was an error trying to execute that command!");
  }
});
