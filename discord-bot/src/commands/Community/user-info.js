const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const axios = require('axios');

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
    .setDescription('Hole Informationen über einen Benutzer von der SCNX API.')
    .addUserOption(option =>
      option
        .setName('member')
        .setDescription('Wähle einen User, der auf dem Server ist')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('user-id')
        .setDescription('Gib eine User-ID ein (für User außerhalb des Servers)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const member = interaction.options.getUser('member');
    const userIdOption = interaction.options.getString('userid');
    let userId;

    if (member && userIdOption) {
      if (member.id !== userIdOption) {
        return interaction.editReply({
          content: '❌ Sorry, aber die Informationen stimmen nicht überein. Bitte fülle **nur ein Feld** aus!',
        });
      } else {
        userId = member.id;
      }
    } else if (member) {
      userId = member.id;
    } else if (userIdOption) {
      userId = userIdOption;
    } else {
      return interaction.editReply({
        content: '❌ Bitte gib entweder einen Server-User oder eine User-ID an!',
      });
    }

    try {
      const response = await axios.get(`https://scnx.app/api/users/${userId}/profile`);
      const data = response.data;

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`👤 Benutzer-Info für ${data.username} (${data.id})`)
        .setThumbnail(data.avatarURL || null)
        .setImage(data.bannerURL || null)
        .addFields(
          { name: 'Tag', value: data.tag || 'N/A', inline: true },
          { name: 'Discriminator', value: data.discriminator || 'N/A', inline: true },
          { name: 'Badges', value: formatFlags(data.flags), inline: false },
          { name: 'Erstellt am', value: data.createdAt ? `<t:${Math.floor(data.createdAt / 1000)}:F>` : 'N/A', inline: false }
        )
        .setFooter({ text: 'Benutzerdaten von SCNX' })
        .setTimestamp();

      const row = new ActionRowBuilder();

      if (data.downloadAvatarURL) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel('🔗 Avatar herunterladen')
            .setStyle(ButtonStyle.Link)
            .setURL(data.downloadAvatarURL)
        );
      }

      if (data.downloadBannerURL) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel('🎨 Banner herunterladen')
            .setStyle(ButtonStyle.Link)
            .setURL(data.downloadBannerURL)
        );
      }

      await interaction.editReply({
        embeds: [embed],
        components: row.components.length > 0 ? [row] : [],
      });

    } catch (error) {
      console.error('Fehler beim Abrufen der User-Daten:', error.response?.data || error.message);
      await interaction.editReply({
        content: '❌ Konnte die User-Informationen nicht abrufen.',
      });
    }
  },
};
