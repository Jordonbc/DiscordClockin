const {
  EmbedBuilder,
  PermissionsBitField,
  ApplicationCommandType,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const Workers = require("../../models/worker.js");
const Roles = require("../../models/roles.js");
const Guildsettings = require("../../models/guildSettings.js");

module.exports = {
  name: "profile",
  description: "» Check the profile from a user",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: "",
  guildOnly: true,
  plan: "Basic",
  category: "Information",
  options: [
    {
      name: "user",
      description: "Choose the user",
      type: 6,
      required: false,
    },
  ],
  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    let userobj = interaction.options.get("user")?.user || interaction.user;

    const guildsettings = await Guildsettings.findOne({
      guildId: interaction.guild.id,
    });

    if (userobj.id != interaction.user.id) {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        ) &&
        !interaction.member.roles.has(guildsettings?.botAdminRole)
      )
        return interaction.editReply({
          content:
            "You are not permitted to use this command on other users! To check other users, you need `Administrator` Permissions",
          ephemeral: true,
        });
    }

    const workers = await Workers.findOne({ guildId: interaction.guild.id });
    const user = workers.workers.find((worker) => worker.userId === userobj.id);

    const notFound = new EmbedBuilder()
      .setColor("#FF0000")
      .setDescription("This user isn't a worker here.");

    if (!user) return interaction.editReply({ embeds: [notFound] });

    const roles = await Roles.findOne({ guildId: interaction.guild.id });
    const role = roles.roles.find((role) => role.id === user.roleId);

    const hours_daily = Math.floor(user.dailyWorked);
    const minutes_daily = Math.floor(
      (user.dailyWorked - hours_daily) / 0.01666667
    );

    const hours_weekly = Math.floor(user.weeklyWorked);
    const minutes_weekly = Math.floor(
      (user.weeklyWorked - hours_weekly) / 0.01666667
    );

    const hours_total = Math.floor(user.totalWorked);
    const minutes_total = Math.floor(
      (user.totalWorked - hours_total) / 0.01666667
    );

    const hourlyRate = role.hourlySalary.get(user.experience);
    const salary = Math.floor(user.weeklyWorked * hourlyRate * 100) / 100;

    const found = new EmbedBuilder()
      .setTitle(`${userobj.tag}‘s Profile`)
      .setColor("#81e6ff")
      .addFields(
        {
          name: "Role:",
          value:
            "```" +
            (user.experience ? user.experience + " " : "") +
            (role ? role.name : "No role found") +
            "```",
          inline: true,
        },
        { name: "Status:", value: "```" + user.status + "```", inline: true },
        { name: "Balance:", value: "```£" + salary + "p```", inline: true },
        {
          name: "Department:",
          value: "```" + role.category + "```",
          inline: false,
        },
        {
          name: "Today worked:",
          value: "```" + `${hours_daily}h ${minutes_daily}m` + "```",
          inline: true,
        },
        {
          name: "This week worked:",
          value: "```" + `${hours_weekly}h ${minutes_weekly}m` + "```",
          inline: true,
        },
        {
          name: "Total worked:",
          value: "```" + `${hours_total}h ${minutes_total}m` + "```",
          inline: true,
        }
      )
      .setFooter({ text: userobj.id });

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("profile_selectMenu")
        .setPlaceholder("🧰 › More info")
        .setDisabled(false)
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Clockins")
            .setEmoji("<:briefcase:1251845682768117861>")
            .setValue("clockins"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Time offs")
            .setEmoji("<:calendarclock:1251845685133836319>")
            .setValue("holidays"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Balance")
            .setEmoji("<:sackdollar:1251843223819780156>")
            .setValue("balance")
        )
    );

    if (
      interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      const manageRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("profile_manage_selectMenu")
          .setPlaceholder("🔨 › Manage user")
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel("Clock out")
              .setEmoji("<:enter:1251849758738350100>")
              .setValue("clockout"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Edit time offs")
              .setEmoji("<:timepast:1251849756964294657>")
              .setValue("timeoffs")
          )
      );

      return interaction.editReply({
        embeds: [found],
        components: [row, manageRow],
      });
    }

    interaction.editReply({ embeds: [found], components: [row] });
  },
};
