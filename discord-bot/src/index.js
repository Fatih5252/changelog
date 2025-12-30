const { Client, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();
const startWebhookServer = require('./webhook-server');
const io = require('@pm2/io');

io.init({
  transactions: true,
  http: true
})

const client = new Client({ intents: [53608447] });

client.commands = new Collection();

client.once('clientReady', () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
  startWebhookServer(client);

  checkStatus();
  setInterval(checkStatus, 1000 * 60 * 2);
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
const SUBSCRIBERS_FILE = './src/incident_subscribers.json';
const PRIMARY_URL = 'https://scnx.app/api/incidents';
const SECONDARY_URL = 'https://status.scootkit.com/summary.json';
const PRIMARY_TIMEOUT_MS = 5000;
const SECONDARY_TIMEOUT_MS = 5000;

let primaryAvailable = true;
let probingPrimary = false;

function getChannelInfo(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return { id: entry, buttons: true };
  if (typeof entry === 'object') {
    const id = entry.id || entry.channel || entry.value;
    if (!id) return null;
    return { id, buttons: entry.buttons !== false };
  }
  return null;
}

function load(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function sendSafe(channel, payload, ctx = '') {
  try {
    await channel.send(payload);
  } catch (err) {
    console.error('❌ Send failed', ctx, channel?.id || 'no-channel-id', '-', err?.message || err);
  }
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
function normalizeFromSecondary(data) {
  const incidents = (data.activeIncidents || []).map((i) => {
    const status = (i.status || '').toUpperCase();
    const impact = (i.impact || '').toUpperCase();
    const resolved = status === 'RESOLVED' ? i.updatedAt || null : null;
    return {
      id: i.id,
      name: i.name,
      translations: { name: { de: i.name, en: i.name } },
      status,
      impact,
      started: i.started || i.updatedAt || null,
      resolved,
      updates: [],
    };
  });

  const maintenances = (data.activeMaintenances || []).map((m) => {
    const status = (m.status || '').toUpperCase();
    const impact = 'UNDERMAINTENANCE';
    const start = m.start || m.updatedAt || null;
    let end = m.end || null;
    if (!end && m.duration && start) {
      const d = Number(m.duration);
      if (!Number.isNaN(d)) {
        end = new Date(new Date(start).getTime() + d * 60000).toISOString();
      }
    }
    return {
      id: m.id,
      name: m.name,
      translations: { name: { de: m.name, en: m.name } },
      status,
      impact,
      start,
      end,
      updates: [],
    };
  });

  return { incidents, maintenances };
}

async function probePrimaryRestore() {
  if (probingPrimary) return;
  probingPrimary = true;
  try {
    const res = await axios.get(PRIMARY_URL, { timeout: PRIMARY_TIMEOUT_MS });
    primaryAvailable = true;
    console.log('ℹ️ Primary API reachable again (probe)');
  } catch {
    // still down, stay on secondary
  } finally {
    probingPrimary = false;
  }
}

async function fetchStatusData() {
  if (primaryAvailable) {
    try {
      const res = await axios.get(PRIMARY_URL, { timeout: PRIMARY_TIMEOUT_MS });
      primaryAvailable = true;
      return { incidents: res.data.incidents || [], maintenances: res.data.maintenances || [], source: 'primary' };
    } catch (primaryErr) {
      primaryAvailable = false;
      console.error('❌ Primary API failed, falling back:', primaryErr.message);
      // continue to secondary
    }
  }

  try {
    const res = await axios.get(SECONDARY_URL, { timeout: SECONDARY_TIMEOUT_MS });
    const normalized = normalizeFromSecondary(res.data || {});
    // kick off background probe to detect recovery
    probePrimaryRestore();
    return { ...normalized, source: 'secondary' };
  } catch (secondaryErr) {
    console.error('❌ Secondary API failed:', secondaryErr.message);
    // still attempt background probe in case secondary is down but primary recovered
    probePrimaryRestore();
    throw secondaryErr;
  }
}

async function checkStatus() {
  try {
    const { incidents, maintenances, source } = await fetchStatusData();

    const subscribers = load(SUBSCRIBERS_FILE, {});
    let subscribersChanged = false;

    const cache = load(CACHE_FILE, { data: null, sent: {}, maintHistory: {} });
    const sent = cache.sent || {};
    const maintHistory = cache.maintHistory || {};
    const current = JSON.stringify({ incidents, maintenances });

    const channels = load(CHANNEL_FILE);

    for (const guildId in channels) {
      const cfg = channels[guildId];
      if (!sent[guildId]) sent[guildId] = { incidents: [], maintenances: [] };
      const enCfg = getChannelInfo(cfg?.en);
      const deCfg = getChannelInfo(cfg?.de);

      /* ---------- INCIDENTS ---------- */
      for (const inc of incidents) {
        const latestUpdateDE = inc.updates?.length ? inc.updates[inc.updates.length - 1].translations?.message?.de || inc.updates[inc.updates.length - 1].message : null;
        const latestUpdateEN = inc.updates?.length ? inc.updates[inc.updates.length - 1].translations?.message?.en || inc.updates[inc.updates.length - 1].message : null;

        // normalize legacy subscriber entries (strings -> objects)
        if (Array.isArray(subscribers[inc.id])) {
          const normalized = subscribers[inc.id]
            .map(s => (typeof s === 'string' ? { id: s, lang: 'en' } : s))
            .filter(s => s && s.id);
          if (normalized.length !== subscribers[inc.id].length) {
            subscribers[inc.id] = normalized;
            subscribersChanged = true;
          }
        }

        // Inform subscribers once an incident is resolved
        if (inc.resolved && Array.isArray(subscribers[inc.id]) && subscribers[inc.id].length > 0) {
          for (const sub of subscribers[inc.id]) {
            const lang = sub.lang === 'de' ? 'de' : 'en';
            const dmText = lang === 'de'
              ? `✅ Der Vorfall "${inc.translations?.name?.de || inc.name}" wurde behoben. Details: https://status.scootkit.com/de/${inc.id}`
              : `✅ Incident "${inc.name}" is resolved. Details: https://status.scootkit.com/en/${inc.id}`;
            try {
              const user = await client.users.fetch(sub.id).catch(() => null);
              if (user) {
                await user.send(dmText);
              }
            } catch (dmErr) {
              console.error('❌ Failed to DM subscriber:', dmErr.message);
            }
          }
          delete subscribers[inc.id];
          subscribersChanged = true;
        }

        const actionRowEN = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`incident_subscribe_request:en:${inc.id}`)
            .setLabel('🔔 Notify me')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`incident_unsubscribe:en:${inc.id}`)
            .setLabel('🚫 Unsubscribe')
            .setStyle(ButtonStyle.Secondary)
        );

        const actionRowDE = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`incident_subscribe_request:de:${inc.id}`)
            .setLabel('🔔 Für Updates anmelden')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`incident_unsubscribe:de:${inc.id}`)
            .setLabel('🚫 Abmelden')
            .setStyle(ButtonStyle.Secondary)
        );

        if (enCfg?.id) {
          const ch = await client.channels.fetch(enCfg.id).catch(() => null);
          if (ch) {
            const componentsEN = inc.resolved || !enCfg.buttons ? [] : [actionRowEN];
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
            const sendKeyEN = `${enCfg.id}:${inc.id}`;
            const alreadySent = sent[guildId].incidents.includes(sendKeyEN);
            if (!alreadySent) {
              await sendSafe(ch, { embeds: [embedEN], components: componentsEN }, `incident EN guild=${guildId} incident=${inc.id} comps=${componentsEN.length}`);
              sent[guildId].incidents.push(sendKeyEN);
            }
          }
        }

        if (deCfg?.id) {
          const ch = await client.channels.fetch(deCfg.id).catch(() => null);
          if (ch) {
            const componentsDE = inc.resolved || !deCfg.buttons ? [] : [actionRowDE];
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
            const sendKeyDE = `${deCfg.id}:${inc.id}`;
            const alreadySent = sent[guildId].incidents.includes(sendKeyDE);
            if (!alreadySent) {
              await sendSafe(ch, { embeds: [embedDE], components: componentsDE }, `incident DE guild=${guildId} incident=${inc.id} comps=${componentsDE.length}`);
              sent[guildId].incidents.push(sendKeyDE);
            }
          }
        }
      }

      /* ---------- MAINTENANCES ---------- */
      for (const m of maintenances) {
        const latestUpdateDE = m.updates?.length ? m.updates[m.updates.length - 1].translations?.message?.de || m.updates[m.updates.length - 1].message : null;
        const latestUpdateEN = m.updates?.length ? m.updates[m.updates.length - 1].translations?.message?.en || m.updates[m.updates.length - 1].message : null;

        const maintKey = `maint:${m.id}`;
        const statusUpper = (m.status || '').toUpperCase();
        const isDone = statusUpper === 'COMPLETED' || statusUpper === 'COMPLETE' || statusUpper === 'COMPLETED';

        // keep last seen maintenance for disappear/completion handling
        maintHistory[maintKey] = m;

        // normalize legacy maintenance entries
        if (Array.isArray(subscribers[maintKey])) {
          const normalized = subscribers[maintKey]
            .map(s => (typeof s === 'string' ? { id: s, lang: 'en' } : s))
            .filter(s => s && s.id);
          if (normalized.length !== subscribers[maintKey].length) {
            subscribers[maintKey] = normalized;
            subscribersChanged = true;
          }
        }

        // Notify maintenance subscribers when completed
        if (isDone && Array.isArray(subscribers[maintKey]) && subscribers[maintKey].length > 0) {
          for (const sub of subscribers[maintKey]) {
            const lang = sub.lang === 'de' ? 'de' : 'en';
            const dmText = lang === 'de'
              ? `✅ Die Wartung "${m.translations?.name?.de || m.name}" ist abgeschlossen. Details: https://status.scootkit.com/de/${m.id}`
              : `✅ Maintenance "${m.translations?.name?.en || m.name}" is completed. Details: https://status.scootkit.com/en/${m.id}`;
            try {
              const user = await client.users.fetch(sub.id).catch(() => null);
              if (user) await user.send(dmText);
            } catch (dmErr) {
              console.error('❌ Failed to DM maintenance subscriber:', dmErr.message);
            }
          }
          delete subscribers[maintKey];
          subscribersChanged = true;
        }

        const maintRowEN = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`maintenance_subscribe_request:en:${m.id}`)
            .setLabel('🔔 Notify me')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`maintenance_unsubscribe:en:${m.id}`)
            .setLabel('🚫 Unsubscribe')
            .setStyle(ButtonStyle.Secondary)
        );

        const maintRowDE = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`maintenance_subscribe_request:de:${m.id}`)
            .setLabel('🔔 Für Updates anmelden')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`maintenance_unsubscribe:de:${m.id}`)
            .setLabel('🚫 Abmelden')
            .setStyle(ButtonStyle.Secondary)
        );

        if (enCfg?.id) {
          const ch = await client.channels.fetch(enCfg.id).catch(() => null);
          if (ch) {
            const componentsEN = (isDone || !enCfg.buttons) ? [] : [maintRowEN];
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
            const maintKeyId = `maint:${m.id}`;
            const sendKeyEN = `${enCfg.id}:${maintKeyId}`;
            const alreadySent = sent[guildId].maintenances.includes(sendKeyEN);
            if (!alreadySent) {
              await sendSafe(ch, { embeds: [embedEN], components: componentsEN }, `maintenance EN guild=${guildId} maintenance=${m.id} comps=${componentsEN.length}`);
              sent[guildId].maintenances.push(sendKeyEN);
            }
          }
        }

        if (deCfg?.id) {
          const ch = await client.channels.fetch(deCfg.id).catch(() => null);
          if (ch) {
            const componentsDE = (isDone || !deCfg.buttons) ? [] : [maintRowDE];
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
            const maintKeyId = `maint:${m.id}`;
            const sendKeyDE = `${deCfg.id}:${maintKeyId}`;
            const alreadySent = sent[guildId].maintenances.includes(sendKeyDE);
            if (!alreadySent) {
              await sendSafe(ch, { embeds: [embedDE], components: componentsDE }, `maintenance DE guild=${guildId} maintenance=${m.id} comps=${componentsDE.length}`);
              sent[guildId].maintenances.push(sendKeyDE);
            }
          }
        }
      }
    }

    // Prune sent lists to only current incidents/maintenances
    const currentIncidentIds = incidents.map(i => i.id);
    const currentMaintIds = maintenances.map(m => `maint:${m.id}`);
    for (const gid in sent) {
      sent[gid].incidents = sent[gid].incidents.filter(key => {
        const parts = key.split(':');
        const incidentId = parts[parts.length - 1];
        return currentIncidentIds.includes(incidentId);
      });
      sent[gid].maintenances = sent[gid].maintenances.filter(key => {
        const parts = key.split(':');
        const maintId = parts.slice(1).join(':');
        return currentMaintIds.includes(maintId);
      });
    }

    // Handle maintenances that disappeared from API (treated as completed)
    const maintSubscriberKeys = Object.keys(subscribers).filter(k => k.startsWith('maint:'));
    for (const key of maintSubscriberKeys) {
      if (currentMaintIds.includes(key)) continue; // still active
      if (!Array.isArray(subscribers[key]) || subscribers[key].length === 0) continue;
      const cachedMaint = maintHistory[key];
      for (const sub of subscribers[key]) {
        const lang = sub.lang === 'de' ? 'de' : 'en';
        const nameDe = cachedMaint?.translations?.name?.de || cachedMaint?.name || 'Wartung';
        const nameEn = cachedMaint?.translations?.name?.en || cachedMaint?.name || 'Maintenance';
        const dmText = lang === 'de'
          ? `✅ Die Wartung "${nameDe}" ist abgeschlossen.`
          : `✅ Maintenance "${nameEn}" is completed.`;
        try {
          const user = await client.users.fetch(sub.id).catch(() => null);
          if (user) await user.send(dmText);
        } catch (dmErr) {
          console.error('❌ Failed to DM maintenance subscriber (disappeared):', dmErr.message);
        }
      }
      delete subscribers[key];
      delete maintHistory[key];
      subscribersChanged = true;
    }

    // Persist cache with history
    save(CACHE_FILE, { data: current, sent, maintHistory });
    if (subscribersChanged) save(SUBSCRIBERS_FILE, subscribers);
    console.log(`✅ Status updated (source=${source || 'unknown'})`);

  } catch (err) {
    console.error('❌ API Error:', err.message);
  }
}
