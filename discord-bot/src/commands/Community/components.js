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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-status')
    .setDescription('Zeigt Scootkit Servers ob die Online oder Offline sind.'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const response = await axios.get(STATUS_URL);
      const components = response.data.components;
      
      const embeds = [];
      const itemsPerPage = 5;

      for (let i = 0; i < components.length; i += itemsPerPage) {
        const currentItems = components.slice(i, i + itemsPerPage);
        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(`Server Status (Seite ${Math.floor(i / itemsPerPage) + 1})`)
          .setDescription(`Zeigt Server ${i + 1} bis ${i + currentItems.length} von ${components.length}`);

        currentItems.forEach(component => {
          embed.addFields({
            name: component.name,
            value: `Status: **${component.status}**`,
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