const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const CHANNEL_FILE = './src/status_channels.json';

const TEXT = {
  en: {
    set: (ch, buttons) => `✅ English status channel set: ${ch} • Buttons: ${buttons ? 'on' : 'off'}`,
    removed: '✅ English status channel removed',
    missing: '❌ No English status channel set',
    already: '❌ A status channel for this language already exists. Remove it first with /status-channel remove.',
    show: (de, en) => `🇩🇪 German status channel: ${de}\n🇬🇧 English status channel: ${en}`,
    invalidLang: '❌ Invalid language selection.',
    setDe: (ch, buttons) => `✅ German status channel set: ${ch} • Buttons: ${buttons ? 'on' : 'off'}`,
    removedDe: '✅ German status channel removed',
    missingDe: '❌ No German status channel set',
  },
  de: {
    set: (ch, buttons) => `✅ Deutscher Status-Channel gesetzt: ${ch} • Buttons: ${buttons ? 'an' : 'aus'}`,
    removed: '✅ Deutscher Status-Channel entfernt',
    missing: '❌ Kein deutscher Status-Channel gesetzt',
    already: '❌ Für diese Sprache ist bereits ein Status-Channel eingetragen. Bitte zuerst mit /status-channel remove entfernen.',
    show: (de, en) => `🇩🇪 Deutscher Status-Channel: ${de}\n🇬🇧 Englischer Status-Channel: ${en}`,
    invalidLang: '❌ Ungültige Sprachauswahl.',
    setDe: (ch, buttons) => `✅ Deutscher Status-Channel gesetzt: ${ch} • Buttons: ${buttons ? 'an' : 'aus'}`,
    removedDe: '✅ Deutscher Status-Channel entfernt',
    missingDe: '❌ Kein deutscher Status-Channel gesetzt',
  },
};

function loadChannels() {
  if (!fs.existsSync(CHANNEL_FILE)) return {};
  return JSON.parse(fs.readFileSync(CHANNEL_FILE, 'utf8'));
}

function saveChannels(data) {
  fs.writeFileSync(CHANNEL_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-channel')
    .setDescription('Manage status channels / Status-Channels verwalten')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Status channel festlegen / Set status channel')
        .addStringOption(opt => opt.setName('language').setDescription('Sprache / Language').setRequired(true)
          .addChoices({ name: 'Deutsch', value: 'de' }, { name: 'English', value: 'en' }))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel auswählen / Select channel').setRequired(true))
        .addBooleanOption(opt => opt.setName('buttons').setDescription('Buttons anzeigen? / Show buttons?').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Status channel entfernen / Remove status channel')
        .addStringOption(opt => opt.setName('language').setDescription('Sprache / Language').setRequired(true)
          .addChoices({ name: 'Deutsch', value: 'de' }, { name: 'English', value: 'en' })))
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show current status channels / Zeige aktuelle Channels')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    let channels = loadChannels();
    const guildId = interaction.guild.id;
    const ensureGuild = () => {
      if (!channels[guildId]) channels[guildId] = {};
    };
    const makeEntry = (channelId, buttons, langDefault) => {
      // default buttons = true unless explicitly false
      const showButtons = buttons === undefined ? true : Boolean(buttons);
      return { id: channelId, buttons: showButtons, lang: langDefault };
    };

    if (sub === 'setup') {
      const langOpt = interaction.options.getString('language');
      const ch = interaction.options.getChannel('channel');
      const buttons = interaction.options.getBoolean('buttons');
      const t = TEXT[langOpt] || TEXT.en;
      if (!['de', 'en'].includes(langOpt)) {
        await interaction.reply({ content: t.invalidLang, flags: MessageFlags.Ephemeral });
        return;
      }
      ensureGuild();
      if (channels[guildId][langOpt]) {
        await interaction.reply({ content: t.already, flags: MessageFlags.Ephemeral });
        return;
      }
      channels[guildId][langOpt] = makeEntry(ch.id, buttons, langOpt);
      saveChannels(channels);
      const msg = langOpt === 'de' ? t.setDe(ch, buttons !== false) : t.set(ch, buttons !== false);
      await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
    } else if (sub === 'remove') {
      const langOpt = interaction.options.getString('language');
      const t = TEXT[langOpt] || TEXT.en;
      if (!['de', 'en'].includes(langOpt)) {
        await interaction.reply({ content: t.invalidLang, flags: MessageFlags.Ephemeral });
        return;
      }
      if (channels[guildId]?.[langOpt]) {
        delete channels[guildId][langOpt];
        saveChannels(channels);
        const msg = langOpt === 'de' ? t.removedDe : t.removed;
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      } else {
        const msg = langOpt === 'de' ? t.missingDe : t.missing;
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      }
    } else if (sub === 'show') {
      const deEntry = channels[guildId]?.de;
      const enEntry = channels[guildId]?.en;
      const chDE = deEntry ? `<#${typeof deEntry === 'string' ? deEntry : deEntry.id}> (Buttons: ${deEntry.buttons === false ? 'aus' : 'an'})` : 'Keiner';
      const chEN = enEntry ? `<#${typeof enEntry === 'string' ? enEntry : enEntry.id}> (Buttons: ${enEntry.buttons === false ? 'off' : 'on'})` : 'None';
      await interaction.reply({ content: TEXT.de.show(chDE, chEN), flags: MessageFlags.Ephemeral });
    }
  }
};
