const { SlashCommandBuilder } = require('@discordjs/builders');
const { checks } = require('../enums.js');
const { defaultLocale, functions } = require('../settings.json');
const { getLocale } = require('../functions.js');
const { guildData } = require('../shared.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('247')
		.setDescription(getLocale(defaultLocale, 'CMD_247_DESCRIPTION'))
		.addBooleanOption(option =>
			option
				.setName('enabled')
				.setDescription(getLocale(defaultLocale, 'CMD_247_OPTION_ENABLED'))),
	checks: [checks.GUILD_ONLY, checks.ACTIVE_SESSION, checks.IN_VOICE, checks.IN_SESSION_VOICE],
	permissions: {
		user: [],
		bot: [],
	},
	async execute(interaction) {
		if (!functions['247'].enabled) {
			await interaction.replyHandler.localeError('FUNCTION_DISABLED');
			return;
		}
		if (functions['247'].whitelist && !guildData.get(`${interaction.guildId}.247.whitelisted`)) {
			await interaction.replyHandler.localeError('CMD_247_NOT_WHITELISTED');
			return;
		}
		const player = interaction.client.music.players.get(interaction.guildId);
		const enabled = interaction.options.getBoolean('enabled');
		let always;
		if (enabled !== null) {
			always = enabled;
		}
		else {
			always = !guildData.get(`${interaction.guildId}.always.enabled`);
		}
		guildData.set(`${interaction.guildId}.always.enabled`, always);
		if (always) {
			guildData.set(`${interaction.guildId}.always.channel`, player.channelId);
			guildData.set(`${interaction.guildId}.always.text`, player.queue.channel.id);
		}
		if (player.timeout) {
			clearTimeout(player.timeout);
			delete player.timeout;
		}
		// pause timeout is theoretically impossible because the user would need to be in the same vc as Quaver
		// and pause timeout is only set when everyone leaves
		await interaction.replyHandler.locale(always ? 'CMD_247_ENABLED' : 'CMD_247_DISABLED', { footer: always ? getLocale(guildData.get(`${interaction.guildId}.locale`) ?? defaultLocale, 'CMD_247_NOTE') : '' });
	},
};
