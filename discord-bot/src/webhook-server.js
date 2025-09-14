// webhook-server.js
const express = require('express');
const bodyParser = require('body-parser');
const { EmbedBuilder } = require('discord.js');

const PORT = 5152;
const CHANNEL_ID = '';

function startWebhookServer(bot) {
  const app = express();

  app.use(bodyParser.json());

  app.post('/github', (req, res) => {
    const event = req.get('X-GitHub-Event');
    const payload = req.body;

    let embed;

    switch (event) {
      case 'push':
        embed = new EmbedBuilder()
          .setTitle(`📦 Push to ${payload.repository.full_name}`)
          .setDescription(payload.commits?.map(c => `• ${c.message}`).join('\n') || 'No commit messages.')
          .setURL(payload.compare)
          .setColor(0x00ff00)
          .setFooter({ text: `Pushed by ${payload.pusher?.name}` })
          .setTimestamp();
        break;

      case 'pull_request':
        embed = new EmbedBuilder()
          .setTitle(`🔀 Pull Request ${payload.action}: #${payload.number}`)
          .setDescription(payload.pull_request?.title || 'No PR title')
          .setURL(payload.pull_request?.html_url)
          .setColor(0x7289DA)
          .setFooter({ text: `By ${payload.pull_request?.user?.login}` })
          .setTimestamp();
        break;

      case 'issues':
        embed = new EmbedBuilder()
          .setTitle(`📋 Issue ${payload.action}: #${payload.issue?.number}`)
          .setDescription(payload.issue?.title || 'No issue title')
          .setURL(payload.issue?.html_url)
          .setColor(0xFFA500)
          .setFooter({ text: `By ${payload.issue?.user?.login}` })
          .setTimestamp();
        break;

      case 'star':
        embed = new EmbedBuilder()
          .setTitle(`⭐ Repository starred!`)
          .setDescription(`${payload.sender?.login} starred ${payload.repository?.full_name}`)
          .setURL(payload.repository?.html_url)
          .setColor(0xFFD700)
          .setTimestamp();
        break;

      default:
        console.log(`ℹ️ Event ${event} received but not handled.`);
        return res.sendStatus(200);
    }

    if (embed) {
      const channel = bot.channels.cache.get(CHANNEL_ID);
      if (channel) {
        channel.send({ embeds: [embed] }).catch(console.error);
      } else {
        console.error('❌ Channel not found!');
      }
    }

    res.sendStatus(200);
  });

  app.listen(PORT, () => {
    console.log(`✅ Webhook server running on port ${PORT}`);
  });
}

module.exports = startWebhookServer;
