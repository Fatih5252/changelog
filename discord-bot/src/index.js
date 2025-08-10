const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const axios = require('axios');
const startWebhookServer = require('./webhook-server');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// Starte Webhook-Server, wenn Bot bereit ist
client.once('ready', () => {
  startWebhookServer(client);
  checkStatus();
  setInterval(checkStatus, 2 * 60 * 1000); // alle 2 Minuten Status checken
});

const functions = fs.readdirSync("./src/functions").filter(file => file.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/events").filter(file => file.endsWith(".js"));
const commandFolders = fs.readdirSync("./src/commands");

(async () => {
  for (file of functions) {
    require(`./functions/${file}`)(client);
  }
  client.handleEvents(eventFiles, "./src/events");
  client.handleCommands(commandFolders, "./src/commands");
  client.login(process.env.token);
})();

const CHANNEL_ID = process.env.STATUS_CHANNEL_ID;
const LAST_STATUS_FILE = './last_status.json';

function loadLastStatus() {
  if (fs.existsSync(LAST_STATUS_FILE)) {
    return JSON.parse(fs.readFileSync(LAST_STATUS_FILE, 'utf8'));
  }
  return null;
}

function saveLastStatus(status) {
  fs.writeFileSync(LAST_STATUS_FILE, JSON.stringify(status));
}

async function checkStatus() {
  try {
    const response = await axios.get('https://status.scootkit.com/summary.json');
    const data = response.data;

    const currentStatus = data.page?.status;
    if (!currentStatus) return;

    const lastStatus = loadLastStatus();
    if (lastStatus === currentStatus) {
      console.log('ℹ️ Kein Statuswechsel.');
      return;
    }

    const channel = await client.channels.fetch(CHANNEL_ID);
    let emoji = '✅';
    if (currentStatus.toLowerCase() === 'down') emoji = '❌';
    else if (currentStatus.toLowerCase() === 'degraded') emoji = '⚠️';

    await channel.send(`${emoji} **Statusänderung:** ${data.page.name} ist jetzt **${currentStatus.toUpperCase()}**\n🔗 ${data.page.url}`);
    saveLastStatus(currentStatus);

  } catch (error) {
    console.error('❌ Fehler beim Prüfen des Status:', error.message);
  }
}