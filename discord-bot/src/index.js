const { Client, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();
const startWebhookServer = require('./webhook-server');

const client = new Client({ intents: [53608447] });

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

const CHANNEL_FILE = './src/status_channels.json';
const CACHE_FILE = './src/last_status.json';

function load(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function ts(date, style = "f") {
  if (!date) return '—';
  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:${style}>`;
}

/* ---------------- EMOJIS ---------------- */
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

/* ---------------- CHECK STATUS ---------------- */
async function checkStatus() {
  try {
    const res = await axios.get('https://scnx.app/api/incidents');
    const incidents = res.data.incidents || [];
    const maintenances = res.data.maintenances || [];

    const cache = load(CACHE_FILE);
    const current = JSON.stringify({ incidents, maintenances });

    if (cache.data === current) {
      console.log('Keine Änderungen gefunden ✅');
      return; // keine Änderungen
    }

    const channels = load(CHANNEL_FILE);

    for (const guildId in channels) {
      const cfg = channels[guildId];

      /* ---------- INCIDENTS ---------- */
      for (const inc of incidents) {
        const latestUpdateDE = inc.updates?.length ? inc.updates[inc.updates.length - 1].translations?.message?.de || inc.updates[inc.updates.length - 1].message : null;
        const latestUpdateEN = inc.updates?.length ? inc.updates[inc.updates.length - 1].translations?.message?.en || inc.updates[inc.updates.length - 1].message : null;

        if (cfg.en) {
          const ch = await client.channels.fetch(cfg.en).catch(() => null);
          if (ch) {
            const embedEN = new EmbedBuilder()
              .setTitle(`🚨 Incident: ${inc.name}`)
              .setDescription(`[🔗 Details](https://status.scootkit.com/en/${inc.id})`)
              .setColor(inc.resolved ? "#00FF00" : "#FF0000")
              .addFields(
                { name: "Status", value: STATUS_EMOJIS_INCIDENT[inc.status?.toUpperCase()]?.en || inc.status || "—", inline: true },
                { name: "Impact", value: IMPACT_EMOJIS[inc.impact?.toUpperCase()]?.en || inc.impact || "—", inline: true },
                { name: "Started", value: ts(inc.started), inline: false },
                ...(latestUpdateEN ? [{ name: "Update", value: latestUpdateEN, inline: false }] : [])
              )
              .setTimestamp();
            if (inc.resolved) embedEN.addFields({ name: "Resolved", value: ts(inc.resolved), inline: false });
            await ch.send({ embeds: [embedEN] });
          }
        }

        if (cfg.de) {
          const ch = await client.channels.fetch(cfg.de).catch(() => null);
          if (ch) {
            const embedDE = new EmbedBuilder()
              .setTitle(`🚨 Vorfall: ${inc.translations?.name?.de || inc.name}`)
              .setDescription(`[🔗 Details](https://status.scootkit.com/de/${inc.id})`)
              .setColor(inc.resolved ? "#00FF00" : "#FF0000")
              .addFields(
                { name: "Status", value: STATUS_EMOJIS_INCIDENT[inc.status?.toUpperCase()]?.de || inc.status || "—", inline: true },
                { name: "Auswirkung", value: IMPACT_EMOJIS[inc.impact?.toUpperCase()]?.de || inc.impact || "—", inline: true },
                { name: "Gestartet", value: ts(inc.started), inline: false },
                ...(latestUpdateDE ? [{ name: "Update", value: latestUpdateDE, inline: false }] : [])
              )
              .setTimestamp();
            if (inc.resolved) embedDE.addFields({ name: "Behoben", value: ts(inc.resolved), inline: false });
            await ch.send({ embeds: [embedDE] });
          }
        }
      }

      /* ---------- MAINTENANCES ---------- */
      for (const m of maintenances) {
        const latestUpdateDE = m.updates?.length ? m.updates[m.updates.length - 1].translations?.message?.de || m.updates[m.updates.length - 1].message : null;
        const latestUpdateEN = m.updates?.length ? m.updates[m.updates.length - 1].translations?.message?.en || m.updates[m.updates.length - 1].message : null;

        if (cfg.en) {
          const ch = await client.channels.fetch(cfg.en).catch(() => null);
          if (ch) {
            const embedEN = new EmbedBuilder()
              .setTitle(`🔧 Maintenance: ${m.translations?.name?.en || m.name}`)
              .setDescription(`[🔗 Details](https://status.scootkit.com/en/${m.id})`)
              .setColor("#FFA500")
              .addFields(
                { name: "Status", value: MAINTENANCE_STATUS[m.status?.toUpperCase()]?.en || m.status || "—", inline: true },
                { name: "Impact", value: MAINTENANCE_IMPACT[m.impact?.toUpperCase()]?.en || m.impact || "—", inline: true },
                { name: "Start", value: ts(m.start), inline: false },
                { name: "End", value: ts(m.end), inline: false },
                ...(latestUpdateEN ? [{ name: "Update", value: latestUpdateEN, inline: false }] : [])
              )
              .setTimestamp();
            await ch.send({ embeds: [embedEN] });
          }
        }

        if (cfg.de) {
          const ch = await client.channels.fetch(cfg.de).catch(() => null);
          if (ch) {
            const embedDE = new EmbedBuilder()
              .setTitle(`🔧 Wartung: ${m.translations?.name?.de || m.name}`)
              .setDescription(`[🔗 Details](https://status.scootkit.com/de/${m.id})`)
              .setColor("#FFA500")
              .addFields(
                { name: "Status", value: MAINTENANCE_STATUS[m.status?.toUpperCase()]?.de || m.status || "—", inline: true },
                { name: "Auswirkung", value: MAINTENANCE_IMPACT[m.impact?.toUpperCase()]?.de || m.impact || "—", inline: true },
                { name: "Start", value: ts(m.start), inline: false },
                { name: "End", value: ts(m.end), inline: false },
                ...(latestUpdateDE ? [{ name: "Update", value: latestUpdateDE, inline: false }] : [])
              )
              .setTimestamp();
            await ch.send({ embeds: [embedDE] });
          }
        }
      }
    }

    save(CACHE_FILE, { data: current });
    console.log('✅ Status updated');

  } catch (err) {
    console.error('❌ API Error:', err.message);
  }
}


client.login(process.env.token);
