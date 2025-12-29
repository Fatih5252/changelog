const { InteractionType, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const fs = require('fs');

module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {
        // Buttons
        if (interaction.isButton()) {
            const { customId } = interaction;

            if (customId && customId.startsWith('incident_subscribe_request:')) {
                const parts = customId.split(':');
                const lang = parts[1] || 'en';
                const incidentId = parts[2];

                const file = './src/incident_subscribers.json';
                let data = {};
                try {
                    if (fs.existsSync(file)) {
                        data = JSON.parse(fs.readFileSync(file, 'utf8'));
                    }
                } catch (err) {
                    console.error('❌ Failed to read subscribers file:', err.message);
                    await interaction.reply({ content: lang === 'de' ? '❌ Konnte die Registrierung nicht prüfen.' : '❌ Could not check your subscription.', flags: MessageFlags.Ephemeral });
                    return;
                }

                if (!data[incidentId]) data[incidentId] = [];
                data[incidentId] = data[incidentId]
                  .map(s => (typeof s === 'string' ? { id: s, lang: 'en' } : s))
                  .filter(s => s && s.id);

                const already = data[incidentId].some(s => s.id === interaction.user.id);
                if (already) {
                    await interaction.reply({ content: lang === 'de' ? '🔔 Du erhältst bereits Updates zu diesem Vorfall.' : '🔔 You are already subscribed to this incident.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const modal = new ModalBuilder()
                    .setCustomId(`incident_subscribe_modal:${lang}:${incidentId}`)
                    .setTitle(lang === 'de' ? 'Incident-Benachrichtigung' : 'Incident Notification');

                const input = new TextInputBuilder()
                    .setCustomId('confirm')
                    .setLabel(lang === 'de' ? 'DM senden, wenn behoben? (ja/nein)' : 'Send DM when resolved? (yes/no)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                await interaction.showModal(modal);
                return;
            }

            if (customId && customId.startsWith('incident_unsubscribe:')) {
                const parts = customId.split(':');
                const lang = parts[1] || 'en';
                const incidentId = parts[2];
                const file = './src/incident_subscribers.json';
                let data = {};

                try {
                    if (fs.existsSync(file)) {
                        data = JSON.parse(fs.readFileSync(file, 'utf8'));
                    }
                } catch (err) {
                    console.error('❌ Failed to read subscribers file:', err.message);
                    await interaction.reply({ content: lang === 'de' ? '❌ Konnte die Abmeldung nicht speichern.' : '❌ Could not process unsubscribe.', flags: MessageFlags.Ephemeral });
                    return;
                }

                                if (!data[incidentId]) data[incidentId] = [];
                                data[incidentId] = data[incidentId]
                                    .map(s => (typeof s === 'string' ? { id: s, lang: 'en' } : s))
                                    .filter(s => s && s.id);

                                const wasSubscribed = data[incidentId].some(s => s.id === interaction.user.id);

                                if (!wasSubscribed) {
                                        await interaction.reply({ content: lang === 'de' ? 'ℹ️ Du warst nicht für diesen Vorfall angemeldet.' : 'ℹ️ You were not subscribed to this incident.', flags: MessageFlags.Ephemeral });
                                        return;
                                }

                                data[incidentId] = data[incidentId].filter(s => s.id !== interaction.user.id);

                try {
                    fs.writeFileSync(file, JSON.stringify(data, null, 2));
                    await interaction.reply({ content: lang === 'de' ? '✅ Du erhältst keine DMs mehr zu diesem Vorfall.' : '✅ You will no longer receive DMs for this incident.', flags: MessageFlags.Ephemeral });
                } catch (err) {
                    console.error('❌ Failed to write subscribers file:', err.message);
                    await interaction.reply({ content: lang === 'de' ? '❌ Konnte die Abmeldung nicht speichern.' : '❌ Could not process unsubscribe.', flags: MessageFlags.Ephemeral });
                }

                return;
            }

            // Maintenance subscribe request
            if (customId && customId.startsWith('maintenance_subscribe_request:')) {
                const parts = customId.split(':');
                const lang = parts[1] || 'en';
                const maintId = parts[2];
                const file = './src/incident_subscribers.json';
                let data = {};

                try {
                    if (fs.existsSync(file)) {
                        data = JSON.parse(fs.readFileSync(file, 'utf8'));
                    }
                } catch (err) {
                    console.error('❌ Failed to read subscribers file:', err.message);
                    await interaction.reply({ content: lang === 'de' ? '❌ Konnte die Registrierung nicht prüfen.' : '❌ Could not check your subscription.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const key = `maint:${maintId}`;
                if (!data[key]) data[key] = [];
                data[key] = data[key]
                  .map(s => (typeof s === 'string' ? { id: s, lang: 'en' } : s))
                  .filter(s => s && s.id);

                const already = data[key].some(s => s.id === interaction.user.id);
                if (already) {
                    await interaction.reply({ content: lang === 'de' ? '🔔 Du erhältst bereits Updates zu dieser Wartung.' : '🔔 You are already subscribed to this maintenance.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const modal = new ModalBuilder()
                    .setCustomId(`maintenance_subscribe_modal:${lang}:${maintId}`)
                    .setTitle(lang === 'de' ? 'Wartungs-Benachrichtigung' : 'Maintenance Notification');

                const input = new TextInputBuilder()
                    .setCustomId('confirm')
                    .setLabel(lang === 'de' ? 'DM senden, wenn abgeschlossen? (ja/nein)' : 'Send DM when completed? (yes/no)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                await interaction.showModal(modal);
                return;
            }

            // Maintenance unsubscribe
            if (customId && customId.startsWith('maintenance_unsubscribe:')) {
                const parts = customId.split(':');
                const lang = parts[1] || 'en';
                const maintId = parts[2];
                const file = './src/incident_subscribers.json';
                let data = {};

                try {
                    if (fs.existsSync(file)) {
                        data = JSON.parse(fs.readFileSync(file, 'utf8'));
                    }
                } catch (err) {
                    console.error('❌ Failed to read subscribers file:', err.message);
                    await interaction.reply({ content: lang === 'de' ? '❌ Konnte die Abmeldung nicht speichern.' : '❌ Could not process unsubscribe.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const key = `maint:${maintId}`;
                if (!data[key]) data[key] = [];
                data[key] = data[key]
                  .map(s => (typeof s === 'string' ? { id: s, lang: 'en' } : s))
                  .filter(s => s && s.id);

                const wasSubscribed = data[key].some(s => s.id === interaction.user.id);

                if (!wasSubscribed) {
                    await interaction.reply({ content: lang === 'de' ? 'ℹ️ Du warst nicht für diese Wartung angemeldet.' : 'ℹ️ You were not subscribed to this maintenance.', flags: MessageFlags.Ephemeral });
                    return;
                }

                data[key] = data[key].filter(s => s.id !== interaction.user.id);

                try {
                    fs.writeFileSync(file, JSON.stringify(data, null, 2));
                    await interaction.reply({ content: lang === 'de' ? '✅ Du erhältst keine DMs mehr zu dieser Wartung.' : '✅ You will no longer receive DMs for this maintenance.', flags: MessageFlags.Ephemeral });
                } catch (err) {
                    console.error('❌ Failed to write subscribers file:', err.message);
                    await interaction.reply({ content: lang === 'de' ? '❌ Konnte die Abmeldung nicht speichern.' : '❌ Could not process unsubscribe.', flags: MessageFlags.Ephemeral });
                }

                return;
            }
        }

        // modal submit
        if (interaction.isModalSubmit()) {
            const { customId } = interaction;
            if (customId && customId.startsWith('incident_subscribe_modal:')) {
                const parts = customId.split(':');
                const lang = parts[1] || 'en';
                const incidentId = parts[2];
                const answer = interaction.fields.getTextInputValue('confirm')?.trim().toLowerCase();

                const yesWords = lang === 'de' ? ['ja', 'j', 'yes', 'y'] : ['yes', 'y', 'ja', 'j'];
                const noWords = lang === 'de' ? ['nein', 'n', 'no'] : ['no', 'n', 'nein'];

                if (noWords.includes(answer)) {
                    await interaction.reply({ content: lang === 'de' ? '🚫 Du hast die Benachrichtigung abgelehnt.' : '🚫 You declined the notification.', flags: MessageFlags.Ephemeral });
                    return;
                }

                if (!yesWords.includes(answer)) {
                    await interaction.reply({ content: lang === 'de' ? '❓ Bitte antworte mit ja oder nein.' : '❓ Please answer yes or no.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const file = './src/incident_subscribers.json';
                let data = {};

                try {
                    if (fs.existsSync(file)) {
                        data = JSON.parse(fs.readFileSync(file, 'utf8'));
                    }
                } catch (err) {
                    console.error('❌ Failed to read subscribers file:', err.message);
                    await interaction.reply({ content: lang === 'de' ? '❌ Konnte die Registrierung nicht speichern.' : '❌ Could not save your subscription.', flags: MessageFlags.Ephemeral });
                    return;
                }

                if (!data[incidentId]) data[incidentId] = [];
                data[incidentId] = data[incidentId]
                  .map(s => (typeof s === 'string' ? { id: s, lang: 'en' } : s))
                  .filter(s => s && s.id);

                const already = data[incidentId].some(s => s.id === interaction.user.id);
                if (already) {
                    await interaction.reply({ content: lang === 'de' ? '🔔 Du erhältst bereits Updates zu diesem Vorfall.' : '🔔 You are already subscribed to this incident.', flags: MessageFlags.Ephemeral });
                    return;
                }

                data[incidentId].push({ id: interaction.user.id, lang });

                try {
                    fs.writeFileSync(file, JSON.stringify(data, null, 2));
                    await interaction.reply({ content: lang === 'de' ? '✅ Du wirst per DM informiert, sobald der Vorfall gelöst ist.' : '✅ You will get a DM when the incident is resolved.', flags: MessageFlags.Ephemeral });
                } catch (err) {
                    console.error('❌ Failed to write subscribers file:', err.message);
                    await interaction.reply({ content: lang === 'de' ? '❌ Konnte die Registrierung nicht speichern.' : '❌ Could not save your subscription.', flags: MessageFlags.Ephemeral });
                }

                return;
            }

            if (customId && customId.startsWith('maintenance_subscribe_modal:')) {
                const parts = customId.split(':');
                const lang = parts[1] || 'en';
                const maintId = parts[2];
                const answer = interaction.fields.getTextInputValue('confirm')?.trim().toLowerCase();

                const yesWords = lang === 'de' ? ['ja', 'j', 'yes', 'y'] : ['yes', 'y', 'ja', 'j'];
                const noWords = lang === 'de' ? ['nein', 'n', 'no'] : ['no', 'n', 'nein'];

                if (noWords.includes(answer)) {
                    await interaction.reply({ content: lang === 'de' ? '🚫 Du hast die Benachrichtigung abgelehnt.' : '🚫 You declined the notification.', flags: MessageFlags.Ephemeral });
                    return;
                }

                if (!yesWords.includes(answer)) {
                    await interaction.reply({ content: lang === 'de' ? '❓ Bitte antworte mit ja oder nein.' : '❓ Please answer yes or no.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const file = './src/incident_subscribers.json';
                let data = {};

                try {
                    if (fs.existsSync(file)) {
                        data = JSON.parse(fs.readFileSync(file, 'utf8'));
                    }
                } catch (err) {
                    console.error('❌ Failed to read subscribers file:', err.message);
                    await interaction.reply({ content: lang === 'de' ? '❌ Konnte die Registrierung nicht speichern.' : '❌ Could not save your subscription.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const key = `maint:${maintId}`;
                if (!data[key]) data[key] = [];
                data[key] = data[key]
                  .map(s => (typeof s === 'string' ? { id: s, lang: 'en' } : s))
                  .filter(s => s && s.id);

                const already = data[key].some(s => s.id === interaction.user.id);
                if (already) {
                    await interaction.reply({ content: lang === 'de' ? '🔔 Du erhältst bereits Updates zu dieser Wartung.' : '🔔 You are already subscribed to this maintenance.', flags: MessageFlags.Ephemeral });
                    return;
                }

                data[key].push({ id: interaction.user.id, lang });

                try {
                    fs.writeFileSync(file, JSON.stringify(data, null, 2));
                    await interaction.reply({ content: lang === 'de' ? '✅ Du wirst per DM informiert, sobald die Wartung abgeschlossen ist.' : '✅ You will get a DM when the maintenance is completed.', flags: MessageFlags.Ephemeral });
                } catch (err) {
                    console.error('❌ Failed to write subscribers file:', err.message);
                    await interaction.reply({ content: lang === 'de' ? '❌ Konnte die Registrierung nicht speichern.' : '❌ Could not save your subscription.', flags: MessageFlags.Ephemeral });
                }

                return;
            }
        }

        // autocomplete
        if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
            const command = client.commands.get(interaction.commandName);
            if (!command || !command.autocomplete) return;

            try {
                await command.autocomplete(interaction, client);
            } catch (error) {
                console.error(error);
            }
            return;
        }

        // Normal commands
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
