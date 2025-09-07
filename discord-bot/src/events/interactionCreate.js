const { InteractionType } = require("discord.js");

module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {
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
                ephemeral: true,
            });
        }
    },
};
