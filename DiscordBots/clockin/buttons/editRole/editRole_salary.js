const {
  EmbedBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
} = require("discord.js");
const Roles = require("../../models/roles.js");
const Workers = require("../../models/worker.js");

module.exports = {
  id: "editRole_salary_button",
  //permissions: [],
  run: async (client, interaction) => {
    const roleId = interaction.message.embeds[0].fields[3].value.slice(3, -3);
    const roles = await Roles.findOne({ guildId: interaction.guild.id });
    let workers = await Workers.findOne({ guildId: interaction.guild.id });
    workers = workers.workers.filter((worker) => worker.roleId === roleId);
    const roleIndex = roles.roles.findIndex((role) => role.id === roleId);

    const StringSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("users")
      .setPlaceholder("Select the role experiences");
    //   .setMinValues(1)
    //   .setMaxValues(4);

    for (experience of roles.experiences) {
      let displayExperience = experience;
      let valueExperience = experience;

      // If this is 'Mid', add padding for the select menu value but keep the original for processing
      if (experience === "Mid") {
        displayExperience = "Mid"; // Keep display name unchanged
        valueExperience = "Mid_"; // Add padding for Discord API
      } else if (experience.length < 4) {
        // Handle any other short experience names
        valueExperience = experience.padEnd(4, "_");
      }

      StringSelectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(displayExperience)
          .setValue(valueExperience)
          .setDefault(false)
      );
    }

    const row1 = new ActionRowBuilder().addComponents(StringSelectMenu);

    const response = await interaction.update({ components: [row1] });

    const collectorFilter = (i) => i.user.id === interaction.user.id;
    try {
      const confirmation = await response.awaitMessageComponent({
        filter: collectorFilter,
        time: 120000,
      });

      // Convert Mid_ back to Mid for comparison with worker experiences
      const normalizedValues = confirmation.values.map((val) =>
        val === "Mid_" ? "Mid" : val.endsWith("_") ? val.slice(0, -1) : val
      );

      let conflicts = "";
      for (const worker of workers) {
        if (!normalizedValues.includes(worker.experience.toLowerCase())) {
          const user = await client.users.cache.get(worker.userId);
          conflicts += `- ${user ? user : worker.userId} [${
            worker.experience
          }]`;
        }
      }

      if (conflicts !== "") {
        const conflictsEmbed = new EmbedBuilder()
          .setColor("Red")
          .setTitle("Role conflicts")
          .setDescription(
            "Some users have selected the experience you want to delete. Please change the role for following users with the `/change-role` command, then try again.\n\n" +
              conflicts
          );

        return confirmation.reply({
          embeds: [conflictsEmbed],
          ephemeral: true,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("newRole_salary_modal")
        .setTitle("➕ | Create a new role");

      for (selectedExperience of confirmation.values) {
        // Convert Mid_ to Mid for the label display but keep the customId as is
        const displayExperience =
          selectedExperience === "Mid_"
            ? "Mid"
            : selectedExperience.endsWith("_")
            ? selectedExperience.slice(0, -1)
            : selectedExperience;

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(selectedExperience)
              .setLabel(`${displayExperience} hourly salary`)
              .setMaxLength(5)
              .setPlaceholder("14.80")
              .setRequired(true)
              .setStyle(TextInputStyle.Short)
          )
        );
      }

      await confirmation.showModal(modal);
      const submitted = await confirmation
        .awaitModalSubmit({
          time: 600000,
          filter: (i) => i.user.id === interaction.user.id,
        })
        .catch((error) => {
          console.error(error);
          return null;
        });

      if (submitted) {
        let hourlySalary = {};
        const fields = submitted.fields.fields;
        fields.map((experience) => {
          if (!isNaN(experience.value)) {
            // Convert "Mid_" to "Mid" if present in the customId
            const experienceKey =
              experience.customId === "Mid_"
                ? "Mid"
                : experience.customId.endsWith("_")
                ? experience.customId.slice(0, -1)
                : experience.customId;

            hourlySalary[experienceKey] = parseFloat(experience.value);
          } else {
            return submitted.update({
              content: ":x: The inputs need to be a number!",
              components: [],
            });
          }
        });

        // Get existing hourly salary data as a plain object
        const existingHourlySalary =
          roles.roles[roleIndex].hourlySalary instanceof Map
            ? Object.fromEntries(roles.roles[roleIndex].hourlySalary)
            : roles.roles[roleIndex].hourlySalary || {};

        // Create the display string for old values
        let hourlySalaryStringOld = "";
        for (const [level, salary] of Object.entries(existingHourlySalary)) {
          if (level !== undefined && salary !== undefined) {
            hourlySalaryStringOld += `${level}: £${salary}p\n`;
          }
        }

        // Merge the new values with existing ones, preserving unmodified values
        const updatedHourlySalary = {
          ...existingHourlySalary,
          ...hourlySalary,
        };

        // Create the display string for new values
        let hourlySalaryString = "";
        for (const [level, salary] of Object.entries(updatedHourlySalary)) {
          if (level !== undefined && salary !== undefined) {
            hourlySalaryString += `${level}: £${salary}p\n`;
          }
        }

        // Update the role with the merged hourly salary data
        roles.roles[roleIndex].hourlySalary = updatedHourlySalary;
        await roles.save();

        const embed = new EmbedBuilder()
          .setColor("Green")
          .setDescription(
            ":white_check_mark: You successfully edited the hourly salaries!"
          )
          .addFields(
            {
              name: "New",
              value: hourlySalaryString || "No salaries set",
              inline: true,
            },
            {
              name: "Old",
              value: hourlySalaryStringOld || "No salaries were set",
              inline: true,
            }
          );

        submitted.update({ embeds: [embed], components: [], content: "" });
      }
    } catch (e) {
      if (e.code === "InteractionCollectorError") {
        await interaction.message.edit({
          content: "Confirmation not received within 2 minute, cancelling",
          components: [],
        });
      } else {
        console.log(e);
        await interaction.message.edit({
          content: "I got a error:\n```" + e.code + "```",
          components: [],
        });
      }
    }
  },
};
