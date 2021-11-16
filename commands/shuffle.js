const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { checks } = require('../enums.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('shuffle')
		.setDescription('Shuffle the queue.'),
	checks: [checks.GUILD_ONLY, checks.ACTIVE_SESSION, checks.IN_VOICE, checks.IN_SESSION_VOICE],
	permissions: {
		user: [],
		bot: [],
	},
	async execute(interaction) {
		const player = interaction.client.music.players.get(interaction.guildId);
		if (player.queue.tracks.length <= 1) {
			await interaction.reply({
				embeds: [
					new MessageEmbed()
						.setDescription('There aren\'t enough tracks in the queue to perform a shuffle.')
						.setColor('DARK_RED'),
				],
				ephemeral: true,
			});
			return;
		}
		player.queue.shuffle();
		await interaction.reply({
			embeds: [
				new MessageEmbed()
					.setDescription('Shuffled the queue successfully.')
					.setColor('#f39bff'),
			],
		});
	},
};