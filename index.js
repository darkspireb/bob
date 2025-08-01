const fs = require('fs');
const { Client, GatewayIntentBits, Partials, SlashCommandBuilder, REST, Routes, Events } = require('discord.js');
const express = require('express');
const app = express();
const port = 3000;

// === Replace these ===
const TOKEN= 'your_discord_token_here';
const CLIENT_ID= 'your_bot_application_id';
const GUILD_ID= 'your_discord_server_id';
// === Keep Replit alive ===
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(port, () => console.log(`Express running on http://localhost:${port}`));

// === Load or initialize welcomeData.json ===
let welcomeData = {};
try {
  welcomeData = JSON.parse(fs.readFileSync('welcomeData.json', 'utf8'));
} catch {
  welcomeData = {};
}

// === Create bot ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// === Slash commands ===
const commands = [
  new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Set or send a welcome message')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Channel to send message').setRequired(true))
    .addStringOption(option =>
      option.setName('description').setDescription('Welcome message (use <@user>)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Set or send a goodbye message')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Channel to send message').setRequired(true))
    .addStringOption(option =>
      option.setName('description').setDescription('Goodbye message (use <@user>)').setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST().setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
})();

// === Slash command handler ===
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const channel = interaction.options.getChannel('channel');
  const message = interaction.options.getString('description').replace('<@user>', `<@${interaction.user.id}>`);

  if (interaction.commandName === 'welcome') {
    welcomeData[interaction.guildId] = welcomeData[interaction.guildId] || {};
    welcomeData[interaction.guildId].welcome = {
      channelId: channel.id,
      message: interaction.options.getString('description')
    };
    fs.writeFileSync('welcomeData.json', JSON.stringify(welcomeData, null, 2));
    await channel.send(message);
    await interaction.reply({ content: '✅ Welcome message saved and sent.', ephemeral: true });
  }

  if (interaction.commandName === 'goodbye') {
    welcomeData[interaction.guildId] = welcomeData[interaction.guildId] || {};
    welcomeData[interaction.guildId].goodbye = {
      channelId: channel.id,
      message: interaction.options.getString('description')
    };
    fs.writeFileSync('welcomeData.json', JSON.stringify(welcomeData, null, 2));
    await channel.send(message);
    await interaction.reply({ content: '👋 Goodbye message saved and sent.', ephemeral: true });
  }
});

// === Auto welcome on join ===
client.on('guildMemberAdd', member => {
  const config = welcomeData[member.guild.id]?.welcome;
  if (config) {
    const channel = member.guild.channels.cache.get(config.channelId);
    if (channel) {
      const message = config.message.replace('<@user>', `<@${member.id}>`);
      channel.send(message);
    }
  }
});

// === Auto goodbye on leave ===
client.on('guildMemberRemove', member => {
  const config = welcomeData[member.guild.id]?.goodbye;
  if (config) {
    const channel = member.guild.channels.cache.get(config.channelId);
    if (channel) {
      const message = config.message.replace('<@user>', `<@${member.id}>`);
      channel.send(message);
    }
  }
});

client.login(TOKEN);
