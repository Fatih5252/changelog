const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("organization")
    .setDescription("Zeigt Informationen oder Dynamic Images einer SCNX-Organisation.")
    .addSubcommand(sub =>
      sub
        .setName("info")
        .setDescription("Zeigt Informationen über eine Organisation anhand ihres Slugs.")
        .addStringOption(option =>
          option
            .setName("slug")
            .setDescription("Der Slug der Organisation (z. B. scootkit, fatih)")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("images")
        .setDescription("Zeigt Dynamic Images einer Organisation anhand der ID.")
        .addIntegerOption(option =>
          option
            .setName("id")
            .setDescription("Die ID der Organisation (z. B. 113)")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    if (sub === "info") {
      const slug = interaction.options.getString("slug");
      try {
        const { data: org } = await axios.get(`https://scnx.app/api/marketplace/organizations/${slug}`);

        const embed = new EmbedBuilder()
          .setTitle(`🏢 ${org.displayName || org.name || "Unbekannte Organisation"}`)
          .setColor("#0099ff")
          .setThumbnail(org.iconUrl || org.icon || null)
          .setDescription(org.shortDescription || org.longDescription || "Keine Beschreibung vorhanden.")
          .addFields(
            { name: "📦 ID", value: `${org.id}`, inline: true },
            { name: "💰 Balance", value: org.balance || "0", inline: true },
            { name: "💸 Accept Payments", value: org.acceptPayments ? "Ja" : "Nein", inline: true },
            { name: "💳 Stripe Setup", value: org.stripeSetup ? "Ja" : "Nein", inline: true },
            { name: "🌐 Slug", value: org.slug || "—", inline: true },
            { name: "👤 Owner ID", value: org.ownerID || "—", inline: true },
            { name: "❤️ Allow Donations", value: org.allowDonations ? "Ja" : "Nein", inline: true },
            { name: "🖼️ Banner", value: org.bannerUrl ? `[Banner anzeigen](${org.bannerUrl})` : "—", inline: false }
          )
          .setTimestamp();

        if (org.links && org.links.length > 0) {
          const links = org.links
            .map(l => `🔗 [${l.displayName || "Website"}](${l.url})`)
            .join("\n");
          embed.addFields({ name: "🌍 Links", value: links, inline: false });
        }

        embed.setFooter({ text: `Mehr erfahren: https://scnx.app/marketplace/organizations/${org.slug || slug}` });

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error("❌ Fehler bei INFO:", error.message);
        await interaction.editReply({
          content: "❌ Fehler: Ungültiger Slug oder Organisation nicht gefunden.",
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
            .setTitle("📭 Keine Bilder gefunden")
            .setDescription("Diese Organisation hat keine Dynamic Images eingerichtet.")
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
          desc += `**${i + 1}. ${img.name || "Unbenannt"}**\n`;
          desc += `🏷️ **Status:** ${img.status}\n`;
          desc += `🔢 **Usage Count:** ${img.usageCount || 0}\n`;
          desc += `🔗 [Bild anzeigen](${img.previewImageURL})\n\n`;
        });

        const embed = new EmbedBuilder()
          .setTitle(`🖼️ Dynamic Images für Organisation ${id} (${images.length} Bilder)`)
          .setDescription(desc)
          .setColor(getColor(images[0].status))
          .setImage(images[0].previewImageURL)
          .setFooter({
            text: `Alle Bilder: https://scnx.app/api/marketplace/organizations/${id}/dynamic-images`,
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error("❌ Fehler bei IMAGES:", error.message);
        await interaction.editReply({
          content: "❌ Fehler: Ungültige Organisation-ID oder Dynamic Images nicht abrufbar.",
          flags: MessageFlags.Ephemeral
        });
      }
    }
  },
};
