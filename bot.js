const tmi = require("tmi.js");
const moment = require("moment");
var express = require("express");
var Sequelize = require("sequelize");
const config = require("config");

var users = [["mikesol", 1], ["sanis_1", 2]];
var User;

// setup a new database
// using database credentials set in config
var sequelize = new Sequelize(
  "database",
  config.get("DB.USER"),
  config.get("DB.PASSWORD"),
  {
    host: "0.0.0.0",
    dialect: "sqlite",
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    },
    // Security note: the database is saved to the file `database.sqlite` on the local filesystem. It's deliberately placed in the `.data` directory
    // which doesn't get copied if someone remixes the project.
    storage: ".data/database.sqlite"
  }
);

// authenticate with the database
sequelize
  .authenticate()
  .then(function(err) {
    console.log("Connection has been established successfully.");
    // define a new table 'users'
    User = sequelize.define("users", {
      id: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      username: {
        type: Sequelize.STRING
      },
      points: {
        type: Sequelize.INTEGER
      },
      subscriber: {
        type: Sequelize.BOOLEAN,
        default: false
      },
      moderator: {
        type: Sequelize.BOOLEAN
      }
    });
  })
  .catch(function(err) {
    console.log("Unable to connect to the database: ", err);
  });
// END OF DATABASE STUFF

// Define configuration options
const opts = {
  identity: {
    username: config.get("Twitch.BOT_USERNAME"),
    password: config.get("Twitch.OAUTH_TOKEN")
  },
  channels: [config.get("Twitch.CHANNEL_NAME")]
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on("message", onMessageHandler);
client.on("connected", onConnectedHandler);

// Connect to Twitch:
client.connect();

// Last heist time
let lastHeistTime = moment();
let performingHeist = false;

// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
  if (self) {
    return;
  } // Ignore messages from the bot

  const fullMessage = msg.trim();
  if (fullMessage.startsWith("!")) {
    console.log(`Received a command from a user!`);
  }

  // Remove whitespace from chat message
  const commandName = msg.trim();

  const username = context.username;
  const id = context["user-id"];
  User.findOrCreate({ where: { username: username, id: id, points: 0 } }).then(
    ([user, created]) => {
      if (created) {
        console.log(`New User Added: ${username}`);
      }

      console.log(
        user.get({
          plain: true
        })
      );
    }
  );

  // If the command is known, let's execute it
  if (commandName === "!heist") {
    const canPerformHeist = checkTimeForHeist();
    if (canPerformHeist) {
      client.say(
        target,
        `Looks like we can begin our cake heist. To join type !joinheist <numberOfCakesToRisk>`
      );
    } else {
      client.say(
        target,
        `Please wait a little longer. The cake cops are still lurking about.`
      );
      client.say(target, `Last heist time: ${lastHeistTime.toString()}`);
    }
    console.log(`* Executed ${commandName} command`);
  } else if (commandName === "!db") {
    var dbUsers = [];
    User.findAll().then(function(users) {
      // find all entries in the users tables
      users.forEach(function(user) {
        console.log(`user: ${user.username}`);
        dbUsers.push([user.username, user.points]); // adds their info to the dbUsers value
      });
      console.log(`dbUsers: ${dbUsers}`);
    });
  } else if (commandName === "!cakes") {
    User.findOne({ where: { userId: userId } }).then(user => {
      client.say(target, `${user.username} you have ${user.points} cakes`);
    });
  } else if (commandName === "!throw cake") {
    client.say(target, `Mike threw a bunch of cakes`);
  } else if (commandName === "!destroy") {
    User.destroy({ where: {} });
    console.log("DESTROYED ALL USERS");
    sequelize.sync();
  } else {
    console.log(`* Unknown command ${commandName}`);
  }
}

// Function called when the "dice" command is issued
function checkTimeForHeist() {
  console.log(`Current last heist time: ${lastHeistTime.toString()}`);
  let currentTime = moment();
  console.log(`Current time: ${currentTime.toString()}`);
  let timeDiffMillis = currentTime - lastHeistTime;
  console.log(`Diff millis: ${timeDiffMillis.toString()}`);

  if (Math.floor(timeDiffMillis / 1000) > 5) {
    lastHeistTime = Date.now();
    return true;
  }

  return false;
}

function rollDice() {
  const sides = 6;
  return Math.floor(Math.random() * sides) + 1;
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}
