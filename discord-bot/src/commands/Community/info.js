const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

const STATUS_URL = 'https://status.scootkit.com/v2/components.json';

const TEXT = {
  en: {
    title: (name) => `📡 Status of ${name}`,
    notFound: '❌ Server not found.',
    error: '❌ Error fetching server status. Please try again later.',
    footer: 'Scootkit Server Status',
    fields: {
      server: 'Server',
      status: 'Status',
      location: 'Location',
      company: 'Company',
      description: 'Description',
      group: 'Group',
      noDescription: 'No description available.',
      noGroup: 'No group',
      unknownLocation: 'Unknown Location',
      unknownCompany: 'Unknown Company',
    },
  },
  de: {
    title: (name) => `📡 Status von ${name}`,
    notFound: '❌ Server nicht gefunden.',
    error: '❌ Fehler beim Abrufen des Serverstatus. Bitte später erneut versuchen.',
    footer: 'Scootkit Server-Status',
    fields: {
      server: 'Server',
      status: 'Status',
      location: 'Standort',
      company: 'Firma',
      description: 'Beschreibung',
      group: 'Gruppe',
      noDescription: 'Keine Beschreibung verfügbar.',
      noGroup: 'Keine Gruppe',
      unknownLocation: 'Unbekannter Standort',
      unknownCompany: 'Unbekannte Firma',
    },
  },
};

const BOT_HOSTS = [
    { name: 'Bot-Host #3', id: 'clwtfvzs974229cdltrcj18ax8' },
    { name: 'Bot-Host #4', id: 'clwtfwf1b73370c6ltqkpntn22' },
    { name: 'Bot-Host #5', id: 'clwtivh1550571b6oksvnoe8ob' },
    { name: 'Bot-Host #6', id: 'clwtivmzm51108bfokvnslwp1q' },
    { name: 'Bot-Host #7', id: 'clwtivowy51264bfok9y2joqj2' },
    { name: 'Bot-Host #8', id: 'clwtorpl08463804okwbsajvrp' },
    { name: 'Bot-Host #9', id: 'clwtivqs350887b6ok9bhug6l7' },
    { name: 'Bot-Host #10', id: 'clwtiwfly51849b6ok31uw0k2s' },
    { name: 'Bot-Host #11', id: 'clwtiwnfk51997b6okq6kq72b3' },
    { name: 'Bot-Host #12', id: 'clwtix8a452621bfokq8ib8iif' },
    { name: 'Bot-Host #13', id: 'clwtixbst52769bfoksm7rkir1' },
    { name: 'Bot-Host #14', id: 'clwtixfh152688b6okro2xv9mm' },
    { name: 'Bot-Host #15', id: 'clwtixion52960bfokljfypz2w' },
    { name: 'Bot-Host #16', id: 'cm4vmi21a0001vmts73o1e7uy' },
    { name: 'Bot-Host #17', id: 'clwtixpgf53237b6ok11d8ms90' },
    { name: 'Bot-Host #18', id: 'clwtomp0n7315504ok0yswn8wo' },
    { name: 'Bot-Host #19', id: 'cm3bik96o001ftij4jizykf5g' },
    { name: 'Bot-Host #20', id: 'cm3bilqg1002dkqi7esuwq1j7' },
    { name: 'Bot-Host #21', id: 'cm3biops80005sj06cg73dx4p' },
    { name: 'Bot-Host #22', id: 'cm3bip9vx000dsj063rt8xqgs' },
    { name: 'Bot-Host #23', id: 'cm7l1u09y00fne3w3hroorcw1' },
    { name: 'Bot-Host #24', id: 'cm7l1u8n4004ecs4apri6tzhv' },
    { name: 'Bot-Host #25', id: 'cmalbkbvj00jn63xwr5p1px9y' },
    { name: 'Bot-Host #26', id: 'cmalbki1s00i05fwq6q1jk4km' },
    { name: 'Bot-Host #27', id: 'cmdvlu6y7054nlg2f2ibaktc7' },
    { name: 'Bot-Host #28', id: 'cmdvluaan006mzjd1er8mgzor' },
    { name: 'Bot-Host #29', id: 'cmdvluda100rjes2zcrjhigt3' },
    { name: 'Bot-Host #30', id: 'cmdvlufbt003510lvrojg180h' },
    { name: 'Bot-Host #31', id: 'cmdvluhqx006y149m54bauiow' },
    { name: 'Bot-Host #32', id: 'cmdvlujmg01q5j2t2pjtj8b6b' },
    { name: 'Bot-Host #33', id: 'cmdvluli8054vlg2frxrmejdi' },
];

const HOST_LOCATIONS = {
  'clwtfvzs974229cdltrcj18ax8': { location: 'Düsseldorf, Germany', company: 'Contabo GmbH' },
  'clwtfwf1b73370c6ltqkpntn22': { location: 'Düsseldorf, Germany', company: 'Contabo GmbH' },
  'clwtivh1550571b6oksvnoe8ob': { location: 'Frankfurt, Germany', company: 'ORACLE Deutschland B.V. & Co. KG' },
  'clwtivmzm51108bfokvnslwp1q': { location: 'Düsseldorf, Germany', company: 'Contabo GmbH' },
  'clwtivowy51264bfok9y2joqj2': { location: 'Seattle, Washington, United States of America', company: 'Contabo GmbH' },
  'clwtorpl08463804okwbsajvrp': { location: 'Düsseldorf, Germany', company: 'Contabo GmbH' },
  'clwtivqs350887b6ok9bhug6l7': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
  'clwtiwfly51849b6ok31uw0k2s': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
  'clwtiwnfk51997b6okq6kq72b3': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
  'clwtix8a452621bfokq8ib8iif': { location: 'Düsseldorf, Germany', company: 'Contabo GmbH' },
  'clwtixbst52769bfoksm7rkir1': { location: 'Düsseldorf, Germany', company: 'Contabo GmbH' },
  'clwtixfh152688b6okro2xv9mm': { location: 'Düsseldorf, Germany', company: 'Contabo GmbH' },
  'clwtixion52960bfokljfypz2w': { location: 'Düsseldorf, Germany', company: 'Contabo GmbH' },
  'cm4vmi21a0001vmts73o1e7uy': { location: 'Düsseldorf, Germany', company: 'Contabo GmbH' },
  'clwtixpgf53237b6ok11d8ms90': { location: 'Nuremberg, Germany', company: 'Netcup GmbH' },
  'clwtomp0n7315504ok0yswn8wo': { location: 'Karlsruhe, Germany', company: 'Contabo GmbH' },
  'cm3bik96o001ftij4jizykf5g': { location: 'Düsseldorf, Germany', company: 'Contabo GmbH' },
  'cm3bilqg1002dkqi7esuwq1j7': { location: 'Manassas, Virginia, United States of America', company: 'Netcup GmbH' },
  'cm3biops80005sj06cg73dx4p': { location: 'Düsseldorf, Germany', company: 'Contabo GmbH' },
  'cm3bip9vx000dsj063rt8xqgs': { location: 'Düsseldorf, Germany', company: 'Contabo GmbH' },
  'cm7l1u09y00fne3w3hroorcw1': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
  'cm7l1u8n4004ecs4apri6tzhv': { location: 'Nuremberg, Germany', company: 'Netcup GmbH' },
  'cmalbkbvj00jn63xwr5p1px9y': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
  'cmalbki1s00i05fwq6q1jk4km': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
  'cmdvlu6y7054nlg2f2ibaktc7': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
  'cmdvluaan006mzjd1er8mgzor': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
  'cmdvluda100rjes2zcrjhigt3': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
  'cmdvlufbt003510lvrojg180h': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
  'cmdvluhqx006y149m54bauiow': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
  'cmdvlujmg01q5j2t2pjtj8b6b': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
  'cmdvluli8054vlg2frxrmejdi': { location: 'Lauterbourg, France', company: 'Contabo GmbH' },
}

const STATUS_MAP = {
  en: {
    operational: { name: 'Online', emoji: '🟢', color: '#00ff00' },
    degraded_performance: { name: 'Degraded', emoji: '🟡', color: '#ffcc00' },
    partial_outage: { name: 'Partial Outage', emoji: '🟠', color: '#ff6600' },
    major_outage: { name: 'Offline', emoji: '🔴', color: '#ff0000' },
    default: { name: 'Unknown', emoji: '⚪', color: '#808080' },
  },
  de: {
    operational: { name: 'Online', emoji: '🟢', color: '#00ff00' },
    degraded_performance: { name: 'Eingeschränkt', emoji: '🟡', color: '#ffcc00' },
    partial_outage: { name: 'Teilweise Störung', emoji: '🟠', color: '#ff6600' },
    major_outage: { name: 'Offline', emoji: '🔴', color: '#ff0000' },
    default: { name: 'Unbekannt', emoji: '⚪', color: '#808080' },
  },
};

function getStatusDetails(status, lang) {
  const map = STATUS_MAP[lang] || STATUS_MAP.en;
  return map[status.toLowerCase()] || map.default;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-info')
    .setDescription('Shows the status of a specific Bot-Host.')
    .addStringOption(option =>
      option
        .setName('host')
        .setDescription('Select the Bot-Host')
        .setAutocomplete(true)
        .setRequired(true)
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

  async autocomplete(interaction) {
    try {
      const focusedOption = interaction.options.getFocused(true);
      const searchValue = focusedOption.value.toLowerCase();

      const choices = BOT_HOSTS.filter(host =>
        host.name.toLowerCase().includes(searchValue)
      );

      await interaction.respond(
        choices.slice(0, 25).map(choice => ({
          name: choice.name,
          value: choice.id,
        }))
      );
    } catch (error) {
      console.error('Error in autocomplete:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    await interaction.deferReply();

    const selectedHostId = interaction.options.getString('host');
    const lang = interaction.options.getString('language') || 'en';
    const t = TEXT[lang] || TEXT.en;

    try {
      const response = await axios.get(STATUS_URL);
      const components = response.data.components;

      const hostComponent = components.find(c => c.id === selectedHostId);

      if (!hostComponent) {
        return interaction.editReply({ content: t.notFound });
      }

      const statusDetails = getStatusDetails(hostComponent.status, lang);

      const info = HOST_LOCATIONS[hostComponent.id] || { location: t.fields.unknownLocation, company: t.fields.unknownCompany };

      const embed = new EmbedBuilder()
        .setColor(statusDetails.color)
        .setTitle(t.title(hostComponent.name))
        .addFields(
            { name: t.fields.server, value: hostComponent.name, inline: true },
            { name: t.fields.status, value: `${statusDetails.emoji} ${statusDetails.name}`, inline: true },
            { name: t.fields.location, value: info.location, inline: false },
            { name: t.fields.company, value: info.company, inline: false },
            { name: t.fields.description, value: hostComponent.description || t.fields.noDescription, inline: false },
            { name: t.fields.group, value: hostComponent.group?.name || t.fields.noGroup, inline: false }
        )
        .setFooter({ text: t.footer })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching server status:', error);
      await interaction.editReply({ content: t.error });
    }
  },
};