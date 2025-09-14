const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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
  return flags.map(f => FLAG_MAP[f] || f).join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('Zeigt Informationen über einen User an.')
    .addUserOption(option =>
      option.setName('member')
        .setDescription('Wähle einen User, der auf dem Server ist')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('id')
        .setDescription('Gib eine User-ID an, wenn der User nicht auf dem Server ist')
        .setRequired(false)
    ),

  async execute(interaction) {
    const member = interaction.options.getUser('member');
    const id = interaction.options.getString('id');
    let user;

    if (member && id && member.id !== id) {
      return interaction.reply({
        content: '❌ Bitte gib nur EINE Option an – entweder User auswählen ODER ID eingeben.',
      });
    }

    try {
      if (member) {
        user = await interaction.client.users.fetch(member.id, { force: true });
      } else if (id) {
        user = await interaction.client.users.fetch(id, { force: true });
      } else {
        return interaction.reply({
          content: '❌ Du musst entweder einen User auswählen oder eine ID angeben.',
        });
      }
    } catch {
      return interaction.reply({
        content: '❌ Konnte User nicht finden. Überprüfe die ID.',
      });
    }

    const avatarURL = user.displayAvatarURL({ size: 1024, dynamic: true });
    await user.fetch(true);
    const bannerURL = user.bannerURL({ size: 1024, dynamic: true });

    const badges = user.flags?.toArray() || [];

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`👤 Benutzer-Info für ${user.username} (${user.id})`)
      .setThumbnail(avatarURL)
      .addFields(
        { name: 'Tag', value: user.username || 'N/A', inline: true },
        { name: 'Discriminator', value: user.discriminator || 'N/A', inline: true },
        { name: 'Badges', value: formatFlags(badges), inline: false },
        { name: 'Erstellt am', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false }
      )
      .setImage(bannerURL || null)
      .setFooter({ text: `ID: ${user.id}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('📥 Avatar herunterladen')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarURL)
    );

    if (bannerURL) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('📥 Banner herunterladen')
          .setStyle(ButtonStyle.Link)
          .setURL(bannerURL)
      );
    }

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
