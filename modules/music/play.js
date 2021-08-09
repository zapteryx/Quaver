const { CommandOptionType } = require("slash-create");

module.exports.commands = ["play", "p"];
module.exports.usage = "%cmd% query";
module.exports.description = "Play a track. Use ytsearch: for YouTube, scsearch: for SoundCloud, or a direct link.";
module.exports.action = async function action (details) {
    const { bot, getPermsMatch, msToTime, msToTimeString } = require("../../main.js");
    if (!details["guild"]) {
        return "guild";
    }
    if (details["body"] === "") {
        return "usage";
    }
    let botPermsMissing = getPermsMatch(details["message"].channel.guild.members.get(bot.user.id).permissions, ["voiceConnect", "voiceSpeak"]);
    if (botPermsMissing.length > 0) {
        return ["self"].concat(botPermsMissing);
    }
    let result = await common(details["body"], details["message"].channel.guild.id, details["message"].author.id, details["message"].channel.id);
    if (result.errored) {
        details["message"].channel.createMessage({
            messageReference: {messageID: details["message"].id},
            embed: {
                description: result.code,
                color: 0xf39bff
            }
        });
        return true;
    }
    let durationTime = msToTime(result.track.info.length);
    let duration = result.track.info.isStream ? "∞" : msToTimeString(durationTime, true);
    if (result.newQueue || result.restartQueue) {
        let playlistAdded = "playlistName" in result ? `\nPlaylist **[${result.playlistName}](${result.playlistUrl})** added \`[${result.successful} tracks]\`` : "";
        details["message"].channel.createMessage({
            embed: {
                description: `Now playing **[${result.track.info.friendlyTitle === null ? result.track.info.title : result.track.info.friendlyTitle}](${result.track.info.uri})** \`[${duration}]\`${playlistAdded}\nAdded by ${result.track.requester.mention}`,
                color: 0xf39bff
            }
        });
        return true;
    }
    if ("playlistName" in result) {
        details["message"].channel.createMessage({
            embed: {
                description: `Added **[${result.playlistName}](${result.playlistUrl})** (${result.successful} tracks) to queue`,
                color: 0xf39bff
            }
        });
        return true;
    }
    if (!result.newQueue && !result.restartQueue) {
        details["message"].channel.createMessage({
            messageReference: {messageID: details["message"].id},
            embed: {
                description: `Added **[${result.track.info.friendlyTitle === null ? result.track.info.title : result.track.info.friendlyTitle}](${result.track.info.uri})** to queue`,
                color: 0xf39bff
            }
        });
        return true;
    }
}

module.exports.slash = {
    name: "play",
    description: module.exports.description,
    deferEphemeral: false,
    options: [
        {
            name: "query",
            description: "Query to search.",
            required: true,
            type: CommandOptionType.STRING
        }
    ],
    guildOnly: true
}
module.exports.slashAction = async function slashAction(ctx) {
    const { bot, slashPermissionRejection, getPermsMatch, msToTime, msToTimeString } = require("../../main.js");
    let botPermsMissing = getPermsMatch(bot.guilds.get(ctx.guildID).members.get(bot.user.id).permissions, ["voiceConnect", "voiceSpeak"]);
    if (botPermsMissing.length > 0) {
        await slashPermissionRejection(ctx, ["self"].concat(botPermsMissing));
        return;
    }
    let result = await common(ctx.options["query"], ctx.guildID, ctx.user.id, ctx.channelID);
    if (result.errored) {
        await ctx.send({
            embeds: [
                {
                    description: result.code,
                    color: 0xf39bff
                }
            ],
            ephemeral: true
        });
        return;
    }
    let durationTime = msToTime(result.track.info.length);
    let duration = result.track.info.isStream ? "∞" : msToTimeString(durationTime, true);
    if (result.newQueue || result.restartQueue) {
        let playlistAdded = "playlistName" in result ? `\nPlaylist **[${result.playlistName}](${result.playlistUrl})** added \`[${result.successful} tracks]\`` : "";
        await ctx.send({
            embeds: [
                {
                    description: `Now playing **[${result.track.info.friendlyTitle === null ? result.track.info.title : result.track.info.friendlyTitle}](${result.track.info.uri})** \`[${duration}]\`${playlistAdded}\nAdded by ${result.track.requester.mention}`,
                    color: 0xf39bff
                }
            ]
        });
        return;
    }
    if ("playlistName" in result) {
        await ctx.send({
            embeds: [
                {
                    description: `Added **[${result.playlistName}](${result.playlistUrl})** (${result.successful} tracks) to queue`,
                    color: 0xf39bff
                }
            ]
        });
        return;
    }
    if (!result.newQueue && !result.restartQueue) {
        await ctx.send({
            embeds: [
                {
                    description: `Added **[${result.track.info.friendlyTitle === null ? result.track.info.title : result.track.info.friendlyTitle}](${result.track.info.uri})** to queue`,
                    color: 0xf39bff
                }
            ]
        });
        return;
    }
}

async function common(query, guildId, userId, channelId) {
    const superagent = require("superagent");
    const { settings, bot } = require("../../main.js");
    // NOTE: while multiple nodes ARE allowed to be specified, only the FIRST one will be used
    const nodes = settings.get("lavalink");
    const { musicGuilds, querySorter, resolveTracks, trackHandler, queueHandler } = require("./util.js");
    if (!bot.guilds.get(guildId).members.get(userId).voiceState.channelID) {
        return {
            errored: true,
            code: "You are not in a voice channel."
        };
    }
    if (guildId in musicGuilds && bot.guilds.get(guildId).members.get(userId).voiceState.channelID != musicGuilds[guildId].voice.id) {
        return {
            errored: true,
            code: "You are not in my voice channel."
        };
    }
    if (querySorter(query).type === "id") {
        try {
            let result = await superagent.get("http://img.youtube.com/vi/" + query + "/mqdefault.jpg");
            if (result.status !== 200) {
                query = `ytsearch:${query}`;
            }
        }
        catch (err) {
            query = `ytsearch:${query}`;
        }
    }
    let sortedQuery = querySorter(query);
    let data = "";
    switch (sortedQuery.type) {
        case "id":
            // YouTube ID (11 char identifier)
            data = sortedQuery.id;
            break;
        case "url":
            // URL
            data = sortedQuery.url;
            break;
        case "spuri":
            // Spotify URI
            data = sortedQuery.spuri;
            break;
        case "scsearch":
            // SoundCloud Search (scsearch:) (explicitly declared)
            data = sortedQuery.search;
            break;
        case "ytsearch":
        case "default":
            // YouTube Search (ytsearch:) (explicitly declared OR none declared)
            data = sortedQuery.search;
            break;
    }
    let tracks = await resolveTracks(nodes[0], data);
    let track = trackHandler(tracks, sortedQuery.type, false);
    if (typeof track !== "object") {
        let error = `Received non-success error: \`${track}\``
        switch (track) {
            case "LOAD_FAILED":
                error = "Something went wrong while loading results for that track."
                break;
            case "UNKNOWN":
                error = "Something weird happened with the results for that track."
                break;
            case "NO_MATCHES":
                error = "No matches found for that query."
                break;
        }
        return {
            errored: true,
            code: error
        };
    }
    let guild = bot.guilds.get(guildId);
    let user = guild.members.get(userId).user;
    let channel = guild.channels.get(channelId);
    let voice = guild.members.get(userId).voiceState.channelID;
    if ("playlistName" in track) {
        let successful = 0;
        let total = 0;
        let newQueue = false;
        let restartQueue = false;
        let firstTrack = null;
        for (const playlistTrack of track.tracks) {
            let queued = await queueHandler(playlistTrack, guild, user, channel, voice);
            if (queued.newQueue) {newQueue = true;}
            if (queued.restartQueue) {restartQueue = true;}
            if (queued.code === "SUCCESS") {
                successful++;
            }
            if (!firstTrack) {
                firstTrack = queued.track;
            }
            total++;
        }
        return {
            errored: false,
            code: "SUCCESS",
            playlistName: track.playlistName,
            playlistUrl: data,
            track: firstTrack,
            successful: successful,
            total: total,
            newQueue: newQueue,
            restartQueue: restartQueue
        }
    }
    let queued = await queueHandler(track, guild, user, channel, voice);
    return {
        errored: queued.code !== "SUCCESS",
        code: queued.code,
        track: queued.track,
        newQueue: queued.newQueue,
        restartQueue: queued.restartQueue
    };
}