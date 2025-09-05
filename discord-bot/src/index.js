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

client.once('ready', () => {
  startWebhookServer(client);
  checkStatus();
  setInterval(checkStatus, 2 * 60 * 1000);
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

const CHANNEL_ID = '';
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

const STATUS_EMOJIS_INCIDENT = {
  INVESTIGATING: '🕵️‍♂️ Untersuche',
  IDENTIFIED: '📌 Problem identifiziert',
  MONITORING: '👀 Beobachtung',
  RESOLVED: '✅ Behoben'
};

const IMPACT_EMOJIS = {
  OPERATIONAL: '✅ Keine Einschränkungen',
  PARTIALOUTAGE: '⚠️ Teilweise Störung',
  MINOROUTAGE: '⚠️ Kleinere Störung',
  MAJOROUTAGE: '🚨 Große Störung'
};

const MAINTENANCE_STATUS = {
  NOTSTARTEDYET: '⏳ Noch nicht gestartet',
  INPROGRESS: '🔧 In Bearbeitung',
  COMPLETED: '✅ Abgeschlossen'
};

async function checkStatus() {
  try {
    const response = await axios.get('https://status.scootkit.com/summary.json');
    const data = response.data;

    const currentStatus = data.page?.status;
    if (!currentStatus) return;

    const lastStatus = loadLastStatus() || {};
    let hasChanges = false;

    if (lastStatus.pageStatus !== currentStatus) {
      const channel = await client.channels.fetch(CHANNEL_ID);

      let emoji = '✅';
      if (currentStatus.toLowerCase() === 'up') emoji = '✅';
      else if (currentStatus.toLowerCase() === 'hasissues') emoji = '⚠️';
      else if (currentStatus.toLowerCase() === 'undermaintenance') emoji = '🛠️';

      await channel.send(`${emoji} **Statusänderung:** ${data.page.name} ist jetzt **${currentStatus.toUpperCase()}**\n🔗 ${data.page.url}`);
      hasChanges = true;
    }

    // Incidents
    const incidents = JSON.stringify(data.activeIncidents || []);
    if (lastStatus.incidents !== incidents) {
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (data.activeIncidents?.length) {
        for (const inc of data.activeIncidents) {
          await channel.send(`🚨 **Incident:** ${inc.name}\n Status: ${STATUS_EMOJIS_INCIDENT[inc.status] || inc.status}\n ID: ${inc.id}\n Auswirkung: ${IMPACT_EMOJIS[inc.impact] || inc.impact}\n Start: ${inc.started}\n Update: ${inc.updatedAt} 🔗 ${inc.url}`);
        }
      } else {
        await channel.send(`✅ **Keine aktiven Incidents**`);
      }
      hasChanges = true;
    }

    // Maintenances
    const maints = JSON.stringify(data.activeMaintenances || []);
    if (lastStatus.maintenances !== maints) {
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (data.activeMaintenances?.length) {
        for (const m of data.activeMaintenances) {
          await channel.send(`🛠️ **Maintenance:** ${m.name}\n Status: ${MAINTENANCE_STATUS[m.status] || m.status}\n ID: ${m.id}\n Dauer: ${m.duration} Minuten\n Start: ${m.start}\n Update: ${m.updatedAt}\n 🔗 ${m.url}`);
        }
      } else {
        await channel.send(`✅ **Keine aktiven Wartungen**`);
      }
      hasChanges = true;
    }

    if (hasChanges) {
      saveLastStatus({
        pageStatus: currentStatus,
        incidents,
        maintenances: maints
      });
    } else {
      console.log('ℹ️ Keine Änderungen seit letztem Check.');
    }

  } catch (error) {
    console.error('❌ Fehler beim Prüfen des Status:', error.message);
  }
}
