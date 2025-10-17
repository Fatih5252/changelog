const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const axios = require('axios');
const startWebhookServer = require('./webhook-server');
require('dotenv').config();

const client = new Client({
  intents: [
    53608447
  ]
});

client.commands = new Collection();

client.once('ready', () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);

  startWebhookServer(client);

  checkStatus();
  setInterval(checkStatus, 1000 * 60 * 5);
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
  INVESTIGATING: { de: '🕵️‍♂️ Untersuche', en: '🕵️‍♂️ Investigating' },
  IDENTIFIED: { de: '📌 Problem identifiziert', en: '📌 Identified' },
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


function toDiscordTimestamp(dateString, style = "f") {
  if (!dateString) return "—";
  const unix = Math.floor(new Date(dateString).getTime() / 1000);
  return `<t:${unix}:${style}>`;
}

async function checkStatus() {
  try {
    const response = await axios.get('https://scnx.app/api/incidents');
    const incidents = response.data;

    const lastStatus = loadLastStatus() || {};
    const lastIncidents = lastStatus.incidents || "[]";
    const currentIncidents = JSON.stringify(incidents);

    const CHANNEL_ID_EN = '';
    const CHANNEL_ID_DE = '';

    if (lastIncidents !== currentIncidents) {

      const channelEN = await client.channels.fetch(CHANNEL_ID_EN);
      const channelDE = await client.channels.fetch(CHANNEL_ID_DE);

      if (incidents.length > 0) {
        for (const inc of incidents) {

          // --- ENGLISCH VERSION ---
          const embedEN = new EmbedBuilder()
            .setTitle(`🚨 Incident: ${inc.name || "Unknown Incident"}`)
            .setColor(inc.resolved ? "#00FF00" : "#FF0000")
            .addFields(
              { name: "Status", value: STATUS_EMOJIS_INCIDENT[inc.status?.toUpperCase()]?.en || inc.status || "Unknown", inline: true },
              { name: "Impact", value: IMPACT_EMOJIS[inc.impact?.toUpperCase()]?.en || inc.impact || "Unknown", inline: true },
              { name: "Started", value: toDiscordTimestamp(inc.started, "f"), inline: false }
            )
            .setTimestamp();

          if (inc.resolved) {
            embedEN.addFields({ name: "Resolved", value: toDiscordTimestamp(inc.resolved, "f"), inline: false });
          }

          if (inc.updates?.length > 0) {
            const latestUpdate = inc.updates[inc.updates.length - 1];
            embedEN.addFields(
              { name: "Last Update", value: toDiscordTimestamp(latestUpdate.createdAt, "R"), inline: false },
              { name: "Update Status", value: STATUS_EMOJIS_INCIDENT[latestUpdate.status?.toUpperCase()]?.en || latestUpdate.status || "—", inline: true },
              { name: "Description", value: (latestUpdate.message || "No update message.").slice(0, 1024) }
            );
            if (latestUpdate.attachments?.length > 0) {
              embedEN.setImage(latestUpdate.attachments[0].url);
            }
          }

          // --- DEUTSCHE VERSION ---
          const titleDE = inc.translations?.name?.de || inc.name || "Unbekannter Vorfall";
          const embedDE = new EmbedBuilder()
            .setTitle(`🚨 Vorfall: ${titleDE}`)
            .setColor(inc.resolved ? "#00FF00" : "#FF0000")
            .addFields(
              { name: "Status", value: STATUS_EMOJIS_INCIDENT[inc.status?.toUpperCase()]?.de || inc.status || "Unbekannt", inline: true },
              { name: "Auswirkung", value: IMPACT_EMOJIS[inc.impact?.toUpperCase()]?.de || inc.impact || "Unbekannt", inline: true },
              { name: "Gestartet", value: toDiscordTimestamp(inc.started, "f"), inline: false }
            )
            .setTimestamp();

          if (inc.resolved) {
            embedDE.addFields({ name: "Behoben", value: toDiscordTimestamp(inc.resolved, "f"), inline: false });
          }

          if (inc.updates?.length > 0) {
            const latestUpdate = inc.updates[inc.updates.length - 1];
            const updateTextDE = latestUpdate.translations?.message?.de || latestUpdate.message || "Kein Update vorhanden.";

            embedDE.addFields(
              { name: "Letztes Update", value: toDiscordTimestamp(latestUpdate.createdAt, "R"), inline: false },
              { name: "Update-Status", value: STATUS_EMOJIS_INCIDENT[latestUpdate.status?.toUpperCase()]?.de || latestUpdate.status || "—", inline: true },
              { name: "Beschreibung", value: updateTextDE.slice(0, 1024) }
            );
            if (latestUpdate.attachments?.length > 0) {
              embedDE.setImage(latestUpdate.attachments[0].url);
            }
          }

          await channelEN.send({ embeds: [embedEN] });
          await channelDE.send({ embeds: [embedDE] });

          const statusDe = STATUS_EMOJIS_INCIDENT[inc.status?.toUpperCase()]?.de || inc.status;
          const statusEn = STATUS_EMOJIS_INCIDENT[inc.status?.toUpperCase()]?.en || inc.status;

          embedDE.addFields({ name: "Status", value: statusDe });
          embedEN.addFields({ name: "Status", value: statusEn });

        }

      } else {
        const embedEN = new EmbedBuilder()
          .setTitle("✅ No active incidents")
          .setColor("#00FF00")
          .setTimestamp();

        const embedDE = new EmbedBuilder()
          .setTitle("✅ Keine aktiven Vorfälle")
          .setColor("#00FF00")
          .setTimestamp();

        await channelEN.send({ embeds: [embedEN] });
        await channelDE.send({ embeds: [embedDE] });
      }

      saveLastStatus({ incidents: currentIncidents });
      console.log("✅ Neue Incident-Daten erkannt und in beiden Channels gesendet.");
    } else {
      console.log("ℹ️ Keine Änderungen seit letztem Check.");
    }

  } catch (error) {
    console.error("❌ Fehler beim Abrufen der SCNX API:", error.message);
  }
}