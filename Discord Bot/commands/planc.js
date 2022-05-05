const challenges = require('./models/challengeModel');
const { MessageEmbed } = require('discord.js');

exports.run = async(bot, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) return message.reply("You are not an admin!");
    if (!args[0]) return message.reply('You must provide a channel id!');

    const allChallenges = await challenges.find();

    const scoreboardEmbed = new MessageEmbed()
        .setColor('#ff0000')
        .setTitle('EZ CTF | Challenges')
        .setTimestamp()
        .setFooter({ text: 'Raxo#0468' });

    allChallenges.map((challenge, index) => scoreboardEmbed.addField(
        `${challenge.name.trim()} | ${challenge.points} | ${challenge.level == 0 ? 'Easy' : challenge.level == 1 ? 'Medium' : challenge.level == 2 ? 'Hard' : 'Ninja'} | ${challenge.category}`,
        "Info: \n```" + challenge.info.replace(/\\n/g, `\n`) + "```\nHints: \n" + challenge.hints.map((hint, index) => `|| ${hint} ||`) + (challenge.file.length > 0 ? `\n\nFile: \n${process.env.SERVER_URI + 'api/assets/' + challenge.file}` : '')));

    message.guild.channels.cache.get(args[0]).send({ embeds: [scoreboardEmbed] });
}

exports.info = {
    name: "planc",
    description: "Very Secret, only for Admins"
}