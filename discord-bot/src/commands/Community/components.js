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

function mapStatus(status) {
  switch (status) {
    case 'OPERATIONAL': return '🟢 Online';
    case 'PARTIALOUTAGE': return '🟡 Eingeschränkt';
    case 'DEGRADEDPERFORMANCE': return '🟠 Teilweise Ausfall';
    case 'MAJOROUTAGE': return '🔴 Offline';
    case 'UNDERMAINTENANCE': return '⚪ Wird Untersucht'
    default: return '⚪ Unbekannt';
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
    .setDescription('Zeigt Scootkit Servers ob die Online oder Offline sind.'),

  async execute(interaction) {
    await interaction.deferReply();

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
          .setTitle(`Server Status (Seite ${Math.floor(i / itemsPerPage) + 1})`)
          .setDescription(
            (hasProblem
              ? `⚠️ **Oh nein, ${problemServers.length} Server könnten Probleme haben!** ⚠️\n\n`
              : '') +
            `Zeigt Server ${i + 1} bis ${i + currentItems.length} von ${components.length}`
          );

        currentItems.forEach(component => {
          embed.addFields({
            name: component.name,
            value: `Status: **${mapStatus(component.status)}**`,
            inline: false,
          });
        });

        embeds.push(embed);
      }


      const createButtons = (currentPage) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('◀️ Vorherige')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Nächste ▶️')
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
          await buttonInteraction.reply({ content: 'Du kannst diese Buttons nicht benutzen!', flags: MessageFlags.Ephemeral });
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
      console.error('Fehler bei der Erstellung der Paginierungsseite:', error);
      await interaction.editReply({ content: 'Ein Fehler ist aufgetreten! Die Anfrage konnte nicht verarbeitet werden.', flags: MessageFlags.Ephemeral });
    }
  },
};
