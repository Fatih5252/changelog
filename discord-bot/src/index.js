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

function toDiscordTimestamp(dateString, style = 'f') {
  if (!dateString) return 'Unbekannt';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return 'Unbekannt';
  const ts = Math.floor(d.getTime() / 1000);
  return `<t:${ts}:${style}>`;
}

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
      let color = '#00FF00';
      if (currentStatus.toLowerCase() === 'up') { emoji = '✅'; color = '#00FF00'; }
      else if (currentStatus.toLowerCase() === 'hasissues') { emoji = '⚠️'; color = '#FFFF00'; }
      else if (currentStatus.toLowerCase() === 'undermaintenance') { emoji = '🛠️'; color = '#FFA500'; }

      const embed = new EmbedBuilder()
        .setTitle(`${emoji} Statusänderung`)
        .setDescription(`${data.page.name} ist jetzt **${currentStatus.toUpperCase()}**\n🔗 [Zur Statusseite](${data.page.url})`)
        .setColor(color)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      hasChanges = true;
    }

    // Incidents
    const incidents = JSON.stringify(data.activeIncidents || []);
    if (lastStatus.incidents !== incidents) {
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (data.activeIncidents?.length) {
        for (const inc of data.activeIncidents) {
          const embed = new EmbedBuilder()
            .setTitle(`🚨 Incident: ${inc.name}`)
            .setDescription(`🔗 [Mehr Details](${inc.url})`)
            .addFields(
              { name: "Status", value: STATUS_EMOJIS_INCIDENT[inc.status] || inc.status || 'Unbekannt', inline: true },
              { name: "Auswirkung", value: IMPACT_EMOJIS[inc.impact] || inc.impact || 'Unbekannt', inline: true },
              { name: "ID", value: inc.id || '—', inline: false },
              { name: "Start", value: toDiscordTimestamp(inc.started, 'f'), inline: false },
              { name: "Update", value: toDiscordTimestamp(inc.updatedAt, 'R'), inline: false },
            )
            .setColor('#FF0000');

          if (inc.updatedAt && !Number.isNaN(new Date(inc.updatedAt).getTime())) {
            embed.setTimestamp(new Date(inc.updatedAt));
          }

          await channel.send({ embeds: [embed] });
        }
      } else {
        const embed = new EmbedBuilder()
          .setTitle("✅ Keine aktiven Incidents")
          .setColor('#00FF00')
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }
      hasChanges = true;
    }

    // Maintenances
    const maints = JSON.stringify(data.activeMaintenances || []);
    if (lastStatus.maintenances !== maints) {
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (data.activeMaintenances?.length) {
        for (const m of data.activeMaintenances) {
          const embed = new EmbedBuilder()
            .setTitle(`🛠️ Maintenance: ${m.name}`)
            .setDescription(`🔗 [Mehr Details](${m.url})`)
            .addFields(
              { name: "Status", value: MAINTENANCE_STATUS[m.status] || m.status || 'Unbekannt', inline: true },
              { name: "ID", value: m.id || '—', inline: false },
              { name: "Dauer", value: `${m.duration ?? '—'} Minuten`, inline: true },
              { name: "Start", value: toDiscordTimestamp(m.start, 'f'), inline: false },
              { name: "Update", value: toDiscordTimestamp(m.updatedAt, 'R'), inline: false },
            )
            .setColor('#FFA500');

          if (m.updatedAt && !Number.isNaN(new Date(m.updatedAt).getTime())) {
            embed.setTimestamp(new Date(m.updatedAt));
          }

          await channel.send({ embeds: [embed] });
        }
      } else {
        const embed = new EmbedBuilder()
          .setTitle("✅ Keine aktiven Wartungen")
          .setColor('#00FF00')
          .setTimestamp();

        await channel.send({ embeds: [embed] });
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