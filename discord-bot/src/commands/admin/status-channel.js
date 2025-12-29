const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const CHANNEL_FILE = './src/status_channels.json';

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
      sub.setName('einrichten-de')
        .setDescription('Deutschen Status-Channel festlegen')
        .addChannelOption(opt => opt.setName('channel').setDescription('Wähle den Channel aus').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('entfernen-de')
        .setDescription('Deutschen Status-Channel entfernen'))
    .addSubcommand(sub =>
      sub.setName('setup-en')
        .setDescription('Set English status channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Select the channel').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove-en')
        .setDescription('Remove English status channel'))
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show current status channels / Zeige aktuelle Channels')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    let channels = loadChannels();
    const guildId = interaction.guild.id;

    if (sub === 'einrichten-de') {
      const ch = interaction.options.getChannel('channel');
      if (!channels[guildId]) channels[guildId] = {};
      channels[guildId].de = ch.id;
      saveChannels(channels);
      await interaction.reply({ content: `✅ Deutscher Status-Channel gesetzt: ${ch}`, flags: MessageFlags.Ephemeral  });
    } else if (sub === 'entfernen-de') {
      if (channels[guildId]?.de) {
        delete channels[guildId].de;
        saveChannels(channels);
        await interaction.reply({ content: `✅ Deutscher Status-Channel entfernt`, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: `❌ Kein deutscher Status-Channel gesetzt`, flags: MessageFlags.Ephemeral });
      }
    } else if (sub === 'setup-en') {
      const ch = interaction.options.getChannel('channel');
      if (!channels[guildId]) channels[guildId] = {};
      channels[guildId].en = ch.id;
      saveChannels(channels);
      await interaction.reply({ content: `✅ English status channel set: ${ch}`, flags: MessageFlags.Ephemeral });
    } else if (sub === 'remove-en') {
      if (channels[guildId]?.en) {
        delete channels[guildId].en;
        saveChannels(channels);
        await interaction.reply({ content: `✅ English status channel removed`, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: `❌ No English status channel set`, flags: MessageFlags.Ephemeral });
      }
    } else if (sub === 'show') {
      const chDE = channels[guildId]?.de ? `<#${channels[guildId].de}>` : 'Keiner';
      const chEN = channels[guildId]?.en ? `<#${channels[guildId].en}>` : 'None';
      await interaction.reply({ content: `🇩🇪 Deutscher Status-Channel: ${chDE}\n🇬🇧 English status channel: ${chEN}`, flags: MessageFlags.Ephemeral });
    }
  }
};
