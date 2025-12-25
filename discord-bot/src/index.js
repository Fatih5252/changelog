const { Client, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const axios = require('axios');
const startWebhookServer = require('./webhook-server');
require('dotenv').config();

const client = new Client({
  intents: [53608447]
});

client.commands = new Collection();

client.once('ready', () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
  startWebhookServer(client);

  checkStatus();
  setInterval(checkStatus, 1000 * 60 * 5);
});

const functions = fs.readdirSync("./src/functions").filter(f => f.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/events").filter(f => f.endsWith(".js"));
const commandFolders = fs.readdirSync("./src/commands");

(async () => {
  for (const file of functions) {
    require(`./functions/${file}`)(client);
  }
  client.handleEvents(eventFiles, "./src/events");
  client.handleCommands(commandFolders, "./src/commands");
  client.login(process.env.token);
})();

const LAST_STATUS_FILE = './last_status.json';

function loadLastStatus() {
  if (fs.existsSync(LAST_STATUS_FILE)) {
    return JSON.parse(fs.readFileSync(LAST_STATUS_FILE, 'utf8'));
  }
  return {};
}

function saveLastStatus(status) {
  fs.writeFileSync(LAST_STATUS_FILE, JSON.stringify(status, null, 2));
}

const STATUS_EMOJIS_INCIDENT = {
  INVESTIGATING: { de: '🕵️‍♂️ Untersuchung', en: '🕵️‍♂️ Investigating' },
  IDENTIFIED: { de: '📌 Identifiziert', en: '📌 Identified' },
  MONITORING: { de: '👀 Beobachtung', en: '👀 Monitoring' },
  RESOLVED: { de: '✅ Behoben', en: '✅ Resolved' }
};

const IMPACT_EMOJIS = {
  OPERATIONAL: { de: '✅ Keine Einschränkungen', en: '✅ Operational' },
  PARTIALOUTAGE: { de: '⚠️ Teilweise Störung', en: '⚠️ Partial Outage' },
  MINOROUTAGE: { de: '⚠️ Kleinere Störung', en: '⚠️ Minor Outage' },
  MAJOROUTAGE: { de: '🚨 Große Störung', en: '🚨 Major Outage' }
};

const MAINTENANCE_STATUS = {
  NOTSTARTEDYET: { de: '⏳ Noch nicht gestartet', en: '⏳ Not started yet' },
  INPROGRESS: { de: '🔧 In Bearbeitung', en: '🔧 In Progress' },
  COMPLETED: { de: '✅ Abgeschlossen', en: '✅ Completed' }
};

const MAINTENANCE_IMPACT = {
  UNDERMAINTENANCE: { de: '🔧 Wartung', en: '🔧 Maintenance' }
};

function toDiscordTimestamp(date, style = "f") {
  if (!date) return "—";
  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:${style}>`;
}

async function checkStatus() {
  try {
    const res = await axios.get('https://scnx.app/api/incidents');
    const { incidents = [], maintenances = [] } = res.data;

    const lastStatus = loadLastStatus();

    const currentIncidents = JSON.stringify(incidents);
    const currentMaintenances = JSON.stringify(maintenances);

    if (
      lastStatus.incidents === currentIncidents &&
      lastStatus.maintenances === currentMaintenances
    ) {
      console.log("ℹ️ Keine Änderungen.");
      return;
    }

    const CHANNEL_ID_EN = '';
    const CHANNEL_ID_DE = '';

    const channelEN = await client.channels.fetch(CHANNEL_ID_EN);
    const channelDE = await client.channels.fetch(CHANNEL_ID_DE);

    for (const inc of incidents) {
      const latest = inc.updates?.[inc.updates.length - 1];

      const embedEN = new EmbedBuilder()
        .setTitle(`🚨 Incident: ${inc.name}`)
        .setColor(inc.resolved ? "#00FF00" : "#FF0000")
        .setDescription(`[🔗 Details](https://status.scootkit.com/en/${inc.id})`)
        .addFields(
          { name: "Status", value: STATUS_EMOJIS_INCIDENT[inc.status]?.en || inc.status, inline: true },
          { name: "Impact", value: IMPACT_EMOJIS[inc.impact]?.en || inc.impact, inline: true },
          { name: "Started", value: toDiscordTimestamp(inc.started), inline: false }
        )
        .setTimestamp();

      if (latest) {
        embedEN.addFields({
          name: "Last Update",
          value: latest.translations?.message?.en || latest.message
        });
      }

      const embedDE = new EmbedBuilder()
        .setTitle(`🚨 Vorfall: ${inc.translations?.name?.de || inc.name}`)
        .setColor(inc.resolved ? "#00FF00" : "#FF0000")
        .setDescription(`[🔗 Details](https://status.scootkit.com/de/${inc.id})`)
        .addFields(
          { name: "Status", value: STATUS_EMOJIS_INCIDENT[inc.status]?.de || inc.status, inline: true },
          { name: "Auswirkung", value: IMPACT_EMOJIS[inc.impact]?.de || inc.impact, inline: true },
          { name: "Start", value: toDiscordTimestamp(inc.started), inline: false }
        )
        .setTimestamp();

      if (latest) {
        embedDE.addFields({
          name: "Letztes Update",
          value: latest.translations?.message?.de || latest.message
        });
      }

      await channelEN.send({ embeds: [embedEN] });
      await channelDE.send({ embeds: [embedDE] });
    }

    for (const m of maintenances) {
      const latest = m.updates?.[m.updates.length - 1];

      const embedEN = new EmbedBuilder()
        .setTitle(`🔧 Maintenance: ${m.translations?.name?.en || m.name}`)
        .setDescription(`[🔗 Details](https://status.scootkit.com/en/${m.id})`)
        .setColor("#FFA500")
        .addFields(
          { name: "Status", value: MAINTENANCE_STATUS[m.status]?.en || m.status, inline: true },
          { name: "Impact", value: MAINTENANCE_IMPACT[m.impact]?.en || m.impact, inline: true },
          { name: "Start", value: toDiscordTimestamp(m.start), inline: false },
          { name: "End", value: toDiscordTimestamp(m.end), inline: false }
        )
        .setTimestamp();

      if (latest) {
        embedEN.addFields({
          name: "Last Update",
          value: latest.translations?.message?.en || latest.message
        });
      }

      const embedDE = new EmbedBuilder()
        .setTitle(`🔧 Wartung: ${m.translations?.name?.de || m.name}`)
        .setDescription(`[🔗 Details](https://status.scootkit.com/de/${m.id})`)
        .setColor("#FFA500")
        .addFields(
          { name: "Status", value: MAINTENANCE_STATUS[m.status]?.de || m.status, inline: true },
          { name: "Auswirkung", value: MAINTENANCE_IMPACT[m.impact]?.de || m.impact, inline: true },
          { name: "Start", value: toDiscordTimestamp(m.start), inline: false },
          { name: "Ende", value: toDiscordTimestamp(m.end), inline: false }
        )
        .setTimestamp();

      if (latest) {
        embedDE.addFields({
          name: "Letztes Update",
          value: latest.translations?.message?.de || latest.message
        });
      }

      await channelEN.send({ embeds: [embedEN] });
      await channelDE.send({ embeds: [embedDE] });
    }

    saveLastStatus({
      incidents: currentIncidents,
      maintenances: currentMaintenances
    });

    console.log("✅ Status aktualisiert.");

  } catch (err) {
    console.error("❌ API Fehler:", err.message);
  }
}
