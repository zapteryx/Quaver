const { SlashCommandBuilder } = require('@discordjs/builders');
const { checks } = require('../enums.js');
const { defaultLocale } = require('../settings.json');
const { getLocale } = require('../functions.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('shuffle')
		.setDescription(getLocale(defaultLocale, 'CMD_SHUFFLE_DESCRIPTION')),
	checks: [checks.GUILD_ONLY, checks.ACTIVE_SESSION, checks.IN_VOICE, checks.IN_SESSION_VOICE],
	permissions: {
		user: [],
		bot: [],
	},
	async execute(interaction) {
		const player = interaction.client.music.players.get(interaction.guildId);
		if (player.queue.tracks.length <= 1) {
			await interaction.replyHandler.localeError('CMD_SHUFFLE_INSUFFICIENT');
			return;
		}
		let currentIndex = player.queue.tracks.length, randomIndex;
		while (currentIndex !== 0) {
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;
			[player.queue.tracks[currentIndex], player.queue.tracks[randomIndex]] = [player.queue.tracks[randomIndex], player.queue.tracks[currentIndex]];
		}
		await interaction.replyHandler.locale('CMD_SHUFFLE_SUCCESS');
	},
};
