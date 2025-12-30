const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const axios = require("axios");

const TEXT = {
  en: {
    info: {
      title: (name) => `🏢 ${name}`,
      noDescription: "No description available.",
      unknownOrg: "Unknown Organization",
      id: "📦 ID",
      balance: "💰 Balance",
      acceptPayments: "💸 Accept Payments",
      stripeSetup: "💳 Stripe Setup",
      slug: "🌐 Slug",
      owner: "👤 Owner ID",
      donations: "❤️ Allow Donations",
      banner: "🖼️ Banner",
      viewBanner: "View Banner",
      links: "🌍 Links",
      learnMore: "Learn more: ",
      notFound: "❌ Error: Invalid slug or organization not found.",
    },
    images: {
      noneTitle: "📭 No images found",
      noneDesc: "This organization has no Dynamic Images set up.",
      title: (id, count) => `🖼️ Dynamic Images for Organization ${id} (${count} images)`,
      status: "Status",
      usage: "Usage Count",
      view: "View Image",
      footer: "All images: ",
      error: "❌ Error: Invalid organization ID or Dynamic Images could not be retrieved.",
    },
    yes: "Yes",
    no: "No",
  },
  de: {
    info: {
      title: (name) => `🏢 ${name}`,
      noDescription: "Keine Beschreibung verfügbar.",
      unknownOrg: "Unbekannte Organisation",
      id: "📦 ID",
      balance: "💰 Guthaben",
      acceptPayments: "💸 Zahlungen akzeptieren",
      stripeSetup: "💳 Stripe eingerichtet",
      slug: "🌐 Slug",
      owner: "👤 Besitzer-ID",
      donations: "❤️ Spenden erlaubt",
      banner: "🖼️ Banner",
      viewBanner: "Banner ansehen",
      links: "🌍 Links",
      learnMore: "Mehr erfahren: ",
      notFound: "❌ Fehler: Ungültiger Slug oder Organisation nicht gefunden.",
    },
    images: {
      noneTitle: "📭 Keine Bilder gefunden",
      noneDesc: "Diese Organisation hat keine Dynamic Images eingerichtet.",
      title: (id, count) => `🖼️ Dynamische Bilder für Organisation ${id} (${count} Bilder)`,
      status: "Status",
      usage: "Nutzungszahl",
      view: "Bild ansehen",
      footer: "Alle Bilder: ",
      error: "❌ Fehler: Ungültige Organisations-ID oder Bilder konnten nicht geladen werden.",
    },
    yes: "Ja",
    no: "Nein",
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("organization")
    .setDescription("Shows information or Dynamic Images of a SCNX organization.")
    .addSubcommand(sub =>
      sub
        .setName("info")
        .setDescription("Shows information about an organization using its slug.")
        .addStringOption(option =>
          option
            .setName("slug")
            .setDescription("The slug of the organization (e.g., scootkit, fatih)")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("language")
            .setDescription("Choose English or German")
            .setRequired(false)
            .addChoices(
              { name: "English", value: "en" },
              { name: "Deutsch", value: "de" },
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("images")
        .setDescription("Shows Dynamic Images of an organization using its ID.")
        .addIntegerOption(option =>
          option
            .setName("id")
            .setDescription("The ID of the organization (e.g., 113)")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("language")
            .setDescription("Choose English or German")
            .setRequired(false)
            .addChoices(
              { name: "English", value: "en" },
              { name: "Deutsch", value: "de" },
            )
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    const lang = interaction.options.getString("language") || "en";
    const t = TEXT[lang] || TEXT.en;

    if (sub === "info") {
      const slug = interaction.options.getString("slug");
      try {
        const { data: org } = await axios.get(`https://scnx.app/api/marketplace/organizations/${slug}`);

        const embed = new EmbedBuilder()
          .setTitle(t.info.title(org.displayName || org.name || t.info.unknownOrg))
          .setColor("#0099ff")
          .setThumbnail(org.iconUrl || org.icon || null)
          .setDescription(org.shortDescription || org.longDescription || t.info.noDescription)
          .addFields(
            { name: t.info.id, value: `${org.id}`, inline: true },
            { name: t.info.balance, value: org.balance || "0", inline: true },
            { name: t.info.acceptPayments, value: org.acceptPayments ? t.yes : t.no, inline: true },
            { name: t.info.stripeSetup, value: org.stripeSetup ? t.yes : t.no, inline: true },
            { name: t.info.slug, value: org.slug || "—", inline: true },
            { name: t.info.owner, value: org.ownerID || "—", inline: true },
            { name: t.info.donations, value: org.allowDonations ? t.yes : t.no, inline: true },
            { name: t.info.banner, value: org.bannerUrl ? `[${t.info.viewBanner}](${org.bannerUrl})` : "—", inline: false }
          )
          .setTimestamp();

        if (org.links && org.links.length > 0) {
          const links = org.links
            .map(l => {
              let cleanUrl = l.url.replace(/^https?:\/\//, "");
              let display = l.displayName ? l.displayName.replace(/^https?:\/\//, "") : cleanUrl;
              return `🔗 [${display}](${l.url})`;
            })
            .join("\n");
          embed.addFields({ name: t.info.links, value: links, inline: false });
        }

        embed.setFooter({ text: `${t.info.learnMore}https://scnx.app/marketplace/organizations/${org.slug || slug}` });

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error("❌ Error in INFO:", error.message);
        await interaction.editReply({
          content: t.info.notFound,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (sub === "images") {
      const id = interaction.options.getInteger("id");
      try {
        const { data: images } = await axios.get(`https://scnx.app/api/marketplace/organizations/${id}/dynamic-images`);

        if (!images || images.length === 0) {
          const embed = new EmbedBuilder()
            .setTitle(t.images.noneTitle)
            .setDescription(t.images.noneDesc)
            .setColor("#ff9900")
            .setTimestamp();
          return await interaction.editReply({ embeds: [embed] });
        }

        const getColor = (status) => {
          switch (status?.toUpperCase()) {
            case "APPROVED": return "#00ff88";
            case "DENIED": return "#ff4444";
            case "PENDING": return "#ffaa00";
            default: return "#00cc99";
          }
        };

        let desc = "";
        images.forEach((img, i) => {
          desc += `**${i + 1}. ${img.name || "Unnamed"}**\n`;
          desc += `🏷️ **${t.images.status}:** ${img.status}\n`;
          desc += `🔢 **${t.images.usage}:** ${img.usageCount || 0}\n`;
          desc += `🔗 [${t.images.view}](${img.previewImageURL})\n\n`;
        });

        const embed = new EmbedBuilder()
          .setTitle(t.images.title(id, images.length))
          .setDescription(desc)
          .setColor(getColor(images[0].status))
          .setImage(images[0].previewImageURL)
          .setFooter({
            text: `${t.images.footer}https://scnx.app/api/marketplace/organizations/${id}/dynamic-images`,
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error("❌ Error in IMAGES:", error.message);
        await interaction.editReply({
          content: t.images.error,
          flags: MessageFlags.Ephemeral
        });
      }
    }
  },
};
