const { SlashCommandBuilder } = require('@discordjs/builders');
const { checks } = require('../enums.js');
const { defaultLocale } = require('../settings.json');
const { getLocale } = require('../functions.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription(getLocale(defaultLocale, 'CMD_STOP_DESCRIPTION')),
	checks: [checks.GUILD_ONLY, checks.ACTIVE_SESSION, checks.IN_VOICE, checks.IN_SESSION_VOICE],
	permissions: {
		user: [],
		bot: [],
	},
	async execute(interaction) {
		const player = interaction.client.music.players.get(interaction.guildId);
		if (!player.queue.current || !player.playing && !player.paused) {
			await interaction.replyHandler.localeError('MUSIC_QUEUE_NOT_PLAYING');
			return;
		}
		player.queue.clear();
		await player.queue.skip();
		await player.queue.start();
		await interaction.replyHandler.locale('CMD_STOP_SUCCESS');
	},
};
