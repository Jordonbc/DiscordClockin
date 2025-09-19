//Aqib new version

const { EmbedBuilder, Collection, PermissionsBitField } = require("discord.js");
const ms = require("ms");
const config = require("../../config.json");
const Settings = require("../../models/guildSettings.js");
const { sendError } = require("../../functions/error.js");
const getLocalCommands = require("../../utils/getLocalCommands.js");

module.exports = async (client, interaction) => {
  const cooldown = new Collection();

  if (!interaction.isChatInputCommand()) return;

  // const slashCommand = client.slashCommands.get(interaction.commandName);

  const premiumLocalCommands = getLocalCommands([], "slashCommands");
  const publicLocalCommands = getLocalCommands([], "publicSlashCommands");
  const allLocalCommands = [...premiumLocalCommands, ...publicLocalCommands];

  const slashCommand = allLocalCommands.find(
    (cmd) => cmd.name === interaction.commandName
  );

  if (!slashCommand)
    // return client.slashCommands.delete(interaction.commandName);
    return console.log(
      `❌ Slash command ${interaction.commandName} not found in local commands!`
    );

  if (interaction.type === 4 && slashCommand.autocomplete) {
    const choices = [];
    await slashCommand.autocomplete(interaction, choices);
    return;
  }

  if (interaction.type !== 2) return;

  try {
    if (slashCommand.guildOnly && !interaction.guild) {
      const embed = new EmbedBuilder()
        .setDescription(
          `🚫 ${interaction.user}, You need to run this command on a server!`
        )
        .setColor("Red");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const guildSettings = await Settings.findOne({
      guildId: interaction.guild?.id,
    });

    if (["Basic", "Pro", "Elite"].includes(slashCommand.plan)) {
      const planOrder = { Basic: 1, Pro: 2, Elite: 3 };
      const currentPlanLevel = planOrder[guildSettings?.plan] || 0;
      const requiredPlanLevel = planOrder[slashCommand.plan];

      if (currentPlanLevel < requiredPlanLevel) {
        const embed = new EmbedBuilder()
          .setDescription(
            `🚫 ${interaction.user}, This server needs the \`${slashCommand.plan}\` plan or higher to use this command!`
          )
          .setColor("Red");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    if (slashCommand.userPerms || slashCommand.botPerms) {
      const hasUserPerms =
        interaction.memberPermissions.has(
          PermissionsBitField.resolve(slashCommand.userPerms || [])
        ) ||
        (guildSettings?.botAdminRole &&
          interaction.member.roles.cache.has(guildSettings.botAdminRole));

      if (!hasUserPerms) {
        const embed = new EmbedBuilder()
          .setDescription(
            `🚫 ${interaction.user}, You don't have \`${slashCommand.userPerms}\` permissions to use this command!`
          )
          .setColor("Red");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const botMember = interaction.guild.members.cache.get(client.user.id);
      const hasBotPerms = botMember?.permissions.has(
        PermissionsBitField.resolve(slashCommand.botPerms || [])
      );

      if (!hasBotPerms) {
        const embed = new EmbedBuilder()
          .setDescription(
            `🚫 ${interaction.user}, I don't have \`${slashCommand.botPerms}\` permissions to use this command!`
          )
          .setColor("Red");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    const cooldownKey = `slash-${slashCommand.name}${interaction.user.id}`;
    if (slashCommand.cooldown) {
      const now = Date.now();
      const cooldownExpiry = cooldown.get(cooldownKey);

      if (cooldownExpiry && cooldownExpiry > now) {
        const timeLeft = ms(cooldownExpiry - now, { long: true });
        return interaction.reply({
          content: config.messages["COOLDOWN_MESSAGE"].replace(
            "<duration>",
            timeLeft
          ),
          ephemeral: true,
        });
      }

      cooldown.set(cooldownKey, now + slashCommand.cooldown);
      setTimeout(() => cooldown.delete(cooldownKey), slashCommand.cooldown);
    }

    await slashCommand.run(client, interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    await sendError(client, error, interaction.user);

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "An error occurred while executing this command.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
};
