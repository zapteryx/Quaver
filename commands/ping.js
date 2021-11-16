const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Check Quaver\'s latency.'),
	checks: [],
	permissions: {
		user: [],
		bot: [],
	},
	async execute(interaction) {
		await interaction.reply({
			embeds: [
				new MessageEmbed()
					.setDescription(`Pong!${interaction.guild ? `${interaction.guild.shard.ping}ms` : ''}`)
					.setColor('#f39bff'),
			],
		});
	},
};