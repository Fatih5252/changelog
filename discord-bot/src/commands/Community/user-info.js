const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const TEXT = {
  en: {
    errors: {
      chooseOne: '❌ Please provide only ONE option: either select a member OR enter an ID.',
      missing: '❌ You must either select a user or provide an ID.',
      notFound: '❌ Could not find the user. Please check the ID.',
    },
    title: (user, id) => `👤 User Info for ${user} (${id})`,
    fields: {
      username: 'Username',
      discriminator: 'Discriminator',
      badges: 'Badges',
      created: 'Account Created',
    },
    buttons: {
      avatar: '📥 Download Avatar',
      banner: '📥 Download Banner',
    },
  },
  de: {
    errors: {
      chooseOne: '❌ Bitte nur EINE Option nutzen: entweder Mitglied auswählen ODER eine ID eingeben.',
      missing: '❌ Du musst entweder einen Nutzer auswählen oder eine ID angeben.',
      notFound: '❌ Nutzer konnte nicht gefunden werden. Bitte prüfe die ID.',
    },
    title: (user, id) => `👤 Nutzerinfo für ${user} (${id})`,
    fields: {
      username: 'Benutzername',
      discriminator: 'Discriminator',
      badges: 'Abzeichen',
      created: 'Konto erstellt',
    },
    buttons: {
      avatar: '📥 Avatar herunterladen',
      banner: '📥 Banner herunterladen',
    },
  },
};

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
  if (!flags || flags.length === 0) return 'None';
  return flags.map(f => FLAG_MAP[f] || f).join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('Shows information about a user.')
    .addUserOption(option =>
      option.setName('member')
        .setDescription('Select a server member')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('id')
        .setDescription('Provide a user ID if the user is not on the server')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('language')
        .setDescription('Choose English or German')
        .setRequired(false)
        .addChoices(
          { name: 'English', value: 'en' },
          { name: 'Deutsch', value: 'de' },
        )
    ),

  async execute(interaction) {
    const member = interaction.options.getUser('member');
    const id = interaction.options.getString('id');
    const lang = interaction.options.getString('language') || 'en';
    const t = TEXT[lang] || TEXT.en;
    let user;

    if (member && id && member.id !== id) {
      return interaction.reply({
        content: t.errors.chooseOne,
      });
    }

    try {
      if (member) {
        user = await interaction.client.users.fetch(member.id, { force: true });
      } else if (id) {
        user = await interaction.client.users.fetch(id, { force: true });
      } else {
        return interaction.reply({
          content: t.errors.missing,
        });
      }
    } catch {
      return interaction.reply({
        content: t.errors.notFound,
      });
    }

    const avatarURL = user.displayAvatarURL({ size: 1024, dynamic: true });
    await user.fetch(true);
    const bannerURL = user.bannerURL({ size: 1024, dynamic: true });

    const badges = user.flags?.toArray() || [];

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(t.title(user.username, user.id))
      .setThumbnail(avatarURL)
      .addFields(
        { name: t.fields.username, value: user.username || 'N/A', inline: true },
        { name: t.fields.discriminator, value: user.discriminator || 'N/A', inline: true },
        { name: t.fields.badges, value: formatFlags(badges), inline: false },
        { name: t.fields.created, value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false }
      )
      .setImage(bannerURL || null)
      .setFooter({ text: `ID: ${user.id}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(t.buttons.avatar)
        .setStyle(ButtonStyle.Link)
        .setURL(avatarURL)
    );

    if (bannerURL) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel(t.buttons.banner)
          .setStyle(ButtonStyle.Link)
          .setURL(bannerURL)
      );
    }

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
