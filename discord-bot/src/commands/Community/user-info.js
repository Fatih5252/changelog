const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder 
} = require('discord.js');
const axios = require('axios');

const API_URL = 'https://scnx.app/api/users';
const PROXY_IP = '';
const PROXY_PORT = 5152;

const FLAG_MAP = {
  Staff: '👨‍💼 Discord Staff',
  Partner: '🤝 Partner',
  Hypesquad: '🎉 HypeSquad Events',
  HypeSquadOnlineHouse1: '🏠 Bravery',
  HypeSquadOnlineHouse2: '🏡 Brilliance',
  HypeSquadOnlineHouse3: '🏘️ Balance',
  BugHunterLevel1: '🐞 Bug Hunter Lv1',
  BugHunterLevel2: '🐛 Bug Hunter Lv2',
  EarlySupporter: '🌟 Early Supporter',
  VerifiedBotDeveloper: '🤖 Verified Bot Dev',
  EarlyVerifiedBotDeveloper: '🤖 Early Verified Bot Dev',
  CertifiedModerator: '🛡️ Moderator',
  ActiveDeveloper: '⚡ Active Developer'
};

function formatFlags(flags) {
  if (!flags || flags.length === 0) return 'Keine';
  return flags
    .map(f => FLAG_MAP[f] || f)
    .join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('Zeigt Informationen über einen Benutzer an.')
    .addUserOption(option =>
      option.setName('member')
        .setDescription('Ein Benutzer, der auf diesem Server ist')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('ID eines Benutzers, der nicht auf dem Server ist')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const member = interaction.options.getUser('member');
    const userIdOption = interaction.options.getString('userid');

    if (member && userIdOption && member.id !== userIdOption) {
      return interaction.editReply('❌ Sorry, aber die Angaben stimmen nicht überein. Bitte nur ein Feld ausfüllen.');
    }

    const userId = member ? member.id : userIdOption;
    if (!userId) {
      return interaction.editReply('❌ Bitte gib entweder ein Server-Mitglied oder eine User-ID an.');
    }

    try {
      const response = await axios.get(`${API_URL}/${userId}/profile`);
      const data = response.data;

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`👤 Benutzer-Info für ${data.username} (${data.id})`)
        .setThumbnail(data.avatarURL || null)
        .addFields(
          { name: 'Tag', value: data.username || 'N/A', inline: true },
          { name: 'Discriminator', value: data.discriminator || 'N/A', inline: true },
          { name: 'Badges', value: formatFlags(data.flags), inline: false },
          { name: 'Erstellt am', value: new Date(data.createdAt).toLocaleString('de-DE'), inline: false }
        );

      if (data.bannerURL) embed.setImage(data.bannerURL);

      const row = new ActionRowBuilder();

      if (data.downloadAvatarURL) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel('🔗 Avatar herunterladen')
            .setStyle(ButtonStyle.Link)
            .setURL(`http://${PROXY_IP}:${PROXY_PORT}/download?url=${encodeURIComponent(data.downloadAvatarURL)}&name=avatar_${data.id}.png`)
        );
      }

      if (data.downloadBannerURL) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel('🎨 Banner herunterladen')
            .setStyle(ButtonStyle.Link)
            .setURL(`http://${PROXY_IP}:${PROXY_PORT}/download?url=${encodeURIComponent(data.downloadBannerURL)}&name=banner_${data.id}.png`)
        );
      }

      await interaction.editReply({ embeds: [embed], components: row.components.length ? [row] : [] });

    } catch (err) {
      console.error(err.message);
      await interaction.editReply('❌ Fehler beim Abrufen der Benutzerdaten!');
    }
  }
};