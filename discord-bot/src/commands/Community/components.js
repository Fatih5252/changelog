const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const axios = require('axios');

const STATUS_URL = 'https://status.scootkit.com/v2/components.json';

const TEXT = {
  en: {
    title: (page) => `Server Status (Page ${page})`,
    issue: (count) => `⚠️ **Oh no, ${count} servers might have issues!** ⚠️`,
    range: (start, end, total) => `Showing servers ${start} to ${end} of ${total}`,
    statusLabel: 'Status',
    prev: '◀️ Previous',
    next: 'Next ▶️',
    forbidden: 'You cannot use these buttons!',
    error: 'An error occurred! Could not process the request.',
  },
  de: {
    title: (page) => `Serverstatus (Seite ${page})`,
    issue: (count) => `⚠️ **Oh nein, ${count} Server könnten Probleme haben!** ⚠️`,
    range: (start, end, total) => `Zeige Server ${start} bis ${end} von ${total}`,
    statusLabel: 'Status',
    prev: '◀️ Zurück',
    next: 'Weiter ▶️',
    forbidden: 'Du kannst diese Buttons nicht nutzen!',
    error: 'Es ist ein Fehler aufgetreten! Anfrage konnte nicht verarbeitet werden.',
  },
};

function mapStatus(status, lang) {
  switch (status) {
    case 'OPERATIONAL': return '🟢 Online';
    case 'PARTIALOUTAGE': return lang === 'de' ? '🟡 Eingeschränkt' : '🟡 Limited';
    case 'DEGRADEDPERFORMANCE': return lang === 'de' ? '🟠 Teilweise Störung' : '🟠 Partial Outage';
    case 'MAJOROUTAGE': return lang === 'de' ? '🔴 Offline' : '🔴 Offline';
    case 'UNDERMAINTENANCE': return lang === 'de' ? '⚪ Wartung' : '⚪ Under Maintenance';
    default: return lang === 'de' ? '⚪ Unbekannt' : '⚪ Unknown';
  }
}

function sortComponents(components) {
  const priorityNames = [];
  for (let i = 1; i <= 33; i++) {
    priorityNames.push(`Bot-Host #${i}`);
  }

  const priorityGroup = components.filter(c => priorityNames.includes(c.name));
  const otherGroup = components.filter(c => !priorityNames.includes(c.name));

  priorityGroup.sort((a, b) => {
    return priorityNames.indexOf(a.name) - priorityNames.indexOf(b.name);
  });

  return [...priorityGroup, ...otherGroup];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-status')
    .setDescription('Shows the status of Scootkit servers.')
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
    await interaction.deferReply();

    const lang = interaction.options.getString('language') || 'en';
    const t = TEXT[lang] || TEXT.en;

    try {
      const response = await axios.get(STATUS_URL);
      let components = response.data.components;

      components = sortComponents(components);

      const embeds = [];
      const itemsPerPage = 12;

      for (let i = 0; i < components.length; i += itemsPerPage) {
        const currentItems = components.slice(i, i + itemsPerPage);

        const problemServers = currentItems.filter(c => c.status !== 'OPERATIONAL');
        const hasProblem = problemServers.length > 0;

        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(t.title(Math.floor(i / itemsPerPage) + 1))
          .setDescription(
            (hasProblem
              ? `${t.issue(problemServers.length)}\n\n`
              : '') +
            t.range(i + 1, i + currentItems.length, components.length)
          );

        currentItems.forEach(component => {
          embed.addFields({
            name: component.name,
            value: `${t.statusLabel}: **${mapStatus(component.status, lang)}**`,
            inline: false,
          });
        });

        embeds.push(embed);
      }

      const createButtons = (currentPage) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel(t.prev)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel(t.next)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === embeds.length - 1)
        );
      };
      
      const message = await interaction.editReply({
        embeds: [embeds[0]],
        components: [createButtons(0)],
      });

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
      });

      let currentPage = 0;

      collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({ content: t.forbidden, flags: MessageFlags.Ephemeral });
          return;
        }

        if (buttonInteraction.customId === 'next_page') {
          currentPage++;
        } else if (buttonInteraction.customId === 'prev_page') {
          currentPage--;
        }

        await buttonInteraction.update({
          embeds: [embeds[currentPage]],
          components: [createButtons(currentPage)],
        });
      });

      collector.on('end', async () => {
        await interaction.editReply({ components: [] });
      });

    } catch (error) {
      console.error('Error creating pagination pages:', error);
      await interaction.editReply({ content: t.error, flags: MessageFlags.Ephemeral });
    }
  },
};
