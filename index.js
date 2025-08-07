const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  REST,
  Routes,
  Events,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require('discord.js');
const express = require('express');
const app = express();
const port = 3000;

// === Replace these ===
const TOKEN = 'YOUR_DISCORD_TOKEN';
const CLIENT_ID = 'YOUR_CLIENT_ID';
const GUILD_ID = 'YOUR_GUILD_ID'; // Needed to register commands

// === Keep Replit alive ===
app.get('/', (req, res) => res.send('✅ Bot is alive!'));
app.listen(port, () => console.log(`Express running on http://localhost:${port}`));

// === Load welcomeData.json (optional for welcome/goodbye) ===
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
      option.setName('description').setDescription('Goodbye message (use <@user>)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('sendverify')
    .setDescription('Sends the verification embed with button')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Where to send the verification message').setRequired(true))
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
  const message = interaction.options.getString('description')?.replace('<@user>', `<@${interaction.user.id}>`);

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

  if (interaction.commandName === 'sendverify') {
    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle('🔒 get member')
      .setDescription('To get access to the rest of the server, please click the "get member" button.')
      .setFooter({ text: 'Powered by темный' });

    const button = new ButtonBuilder()
      .setCustomId('verify_button')
      .setLabel('GET MEMBER')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Sent verification message.', ephemeral: true });
  }
});

// === Button interaction handler ===
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton() && interaction.customId === 'verify_button') {
    const roleId = '1370756605662199829'; // ✅ Role to assign on verify
    const member = interaction.guild.members.cache.get(interaction.user.id);
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.reply({ content: '⚠️ Role not found.', ephemeral: true });
    }

    if (member.roles.cache.has(roleId)) {
      return interaction.reply({ content: '✅ You are already given a member rule!', ephemeral: true });
    }

    await member.roles.add(roleId);
    await interaction.reply({ content: '✅ You have been member and given access.', ephemeral: true });
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

// === Start the bot ===
client.login(TOKEN);

// === Bot status ===
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  client.user.setActivity('Replit pings', { type: 'WATCHING' });
  client.user.setStatus('online');
});
