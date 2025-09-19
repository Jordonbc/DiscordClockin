// const {
//   EmbedBuilder,
//   ApplicationCommandType,
//   TextInputBuilder,
//   ModalBuilder,
//   TextInputStyle,
//   ActionRowBuilder,
//   StringSelectMenuBuilder,
//   StringSelectMenuOptionBuilder,
// } = require("discord.js");
// const Role = require("../../models/roles.js");
// const Settings = require("../../models/guildSettings.js");

// // Function to generate a random ID
// function generateRandomId() {
//   const chars =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   let id = "";
//   for (let i = 0; i < 2; i++) {
//     id += chars.charAt(Math.floor(Math.random() * chars.length));
//   }
//   return id;
// }

// module.exports = {
//   name: "addrole",
//   description: "» Create a new worker role",
//   cooldown: 3000,
//   type: ApplicationCommandType.ChatInput,
//   guildOnly: true,
//   default_member_permissions: "Administrator",
//   plan: "Basic",
//   options: [
//     {
//       name: "name",
//       description: "What will be the name of the role",
//       type: 3,
//       required: true,
//     },
//     {
//       name: "category",
//       description: "In which category the role should be?",
//       type: 3,
//       required: true,
//     },
//   ],
//   // Creates a new role for the server - takes the name and category of the role as arguments
//   run: async (client, interaction) => {
//     await interaction.deferReply();

//     // Fetch the guild settings
//     const guildSettings = await Settings.findOne({
//       guildId: interaction.guild.id,
//     });

//     // Fetch the roles for the guild
//     const guildRoles = await Role.findOne({ guildId: interaction.guild.id });

//     // Check if the server has reached the maximum number of roles
//     if (guildSettings.plan === "Basic") {
//       if (guildRoles?.roles.length > 9) {
//         const maxRoles = new EmbedBuilder()
//           .setDescription(
//             `🚫 ${interaction.user}, This server reached the maximum of **10** roles! Upgrade to the \`Pro\` plan or higher to create more roles!`
//           )
//           .setColor("Red");

//         return interaction.editReply({ embeds: [maxRoles] });
//       }
//     }

//     // Get the name and category of the role
//     const category = interaction.options.getString("category");
//     const name = interaction.options.get("name").value;

//     // Create a select menu for the experiences
//     const StringSelectMenu = new StringSelectMenuBuilder()
//       .setCustomId("users")
//       .setPlaceholder("Select the role experiences")
//       .setMinValues(1)
//       .setMaxValues(4);

//     for (experience of guildRoles.experiences) {
//       StringSelectMenu.addOptions(
//         new StringSelectMenuOptionBuilder()
//           .setLabel(experience)
//           .setValue(experience)
//           .setDefault(false)
//       );
//     }

//     // Create the action row
//     const row1 = new ActionRowBuilder().addComponents(StringSelectMenu);

//     // Edit the reply to ask for the hourly salary for each experience
//     const response = await interaction.editReply({
//       content: "Which experience should be enabled for the role?",
//       components: [row1],
//     });

//     // Filter for the collector
//     const collectorFilter = (i) => i.user.id === interaction.user.id;

//     // Await the user's response
//     try {
//       const confirmation = await response.awaitMessageComponent({
//         filter: collectorFilter,
//         time: 120000,
//       });

//       // Create a modal to ask for the hourly salary for the selected experiences
//       const modal = new ModalBuilder()
//         .setCustomId("newRole_salary_modal")
//         .setTitle("➕ | Create a new role");

//       // Add a text input for each selected experience
//       for (selectedExperience of confirmation.values) {
//         modal.addComponents(
//           new ActionRowBuilder().addComponents(
//             new TextInputBuilder()
//               .setCustomId(selectedExperience)
//               .setLabel(`${selectedExperience} hourly salary`)
//               .setMaxLength(5)
//               .setPlaceholder("14.80")
//               .setRequired(true)
//               .setStyle(TextInputStyle.Short)
//           )
//         );
//       }

//       // Listen for the modal submit
//       await confirmation.showModal(modal);
//       const submitted = await confirmation
//         .awaitModalSubmit({
//           time: 600000,
//           filter: (i) => i.user.id === interaction.user.id,
//         })
//         .catch((error) => {
//           console.error(error);
//           return null;
//         });

//       // Handle the submitted data
//       if (submitted) {
//         let uniqueId = generateRandomId();

//         let hourlySalary = {};
//         const fields = submitted.fields.fields;
//         fields.map((experience) => {
//           if (!isNaN(experience.value)) {
//             hourlySalary[experience.customId] = parseFloat(experience.value);
//           } else {
//             return submitted.update({
//               content: ":x: The inputs need to be a number!",
//               components: [],
//             });
//           }
//         });

//         if (!guildRoles) {
//           const newRole = new Role({
//             guildId: interaction.guild.id,
//             roles: {
//               name: name,
//               hourlySalary: hourlySalary,
//               category: category,
//               id: uniqueId,
//             },
//             categorys: [category],
//           });
//           await newRole.save();
//         } else {
//           while (guildRoles.roles.some((role) => role.id === uniqueId)) {
//             uniqueId = generateRandomId();
//           }

//           if (!guildRoles.categorys.includes(category)) {
//             // Wenn die Kategorie noch nicht vorhanden ist, füge sie hinzu
//             guildRoles.categorys.push(category);
//           }

//           guildRoles.roles.push({
//             name: name,
//             hourlySalary: hourlySalary,
//             category: category,
//             id: uniqueId,
//           });

//           await guildRoles.save();
//         }

//         let hourlySalaryString = "";
//         for (const [level, salary] of Object.entries(hourlySalary)) {
//           if (level !== undefined && salary !== undefined) {
//             hourlySalaryString += `${level}: £${salary}p\n`;
//           }
//         }

//         const embed = new EmbedBuilder()
//           .setColor("Green")
//           .setDescription("**Successfully created the role!**")
//           .addFields(
//             {
//               name: "<:icon_manage:1143982720356204684> Role name",
//               value: "```" + name + "```",
//               inline: true,
//             },
//             {
//               name: "<:icon_pound:1143982650525241426> Hourly salary",
//               value: "```" + hourlySalaryString + "```",
//               inline: true,
//             },
//             { name: "Category", value: "```" + category + "```", inline: true },
//             {
//               name: "<:icon_id:1145681522855260262> Role ID",
//               value: "```" + uniqueId + "```",
//               inline: true,
//             }
//           );

//         await submitted.update({
//           content: "",
//           embeds: [embed],
//           components: [],
//         });
//       }
//     } catch (e) {
//       await interaction.editReply({
//         content: "Confirmation not received within 2 minute, cancelling",
//         components: [],
//       });
//     }
//   },
// };

const {
  EmbedBuilder,
  ApplicationCommandType,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const Role = require("../../models/roles.js");
const Settings = require("../../models/guildSettings.js");

// Function to generate a random ID
function generateRandomId() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 2; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

module.exports = {
  name: "addrole",
  description: "» Create a new worker role",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  guildOnly: true,
  default_member_permissions: "Administrator",
  plan: "Basic",
  category: "Admin",
  options: [
    {
      name: "name",
      description: "What will be the name of the role",
      type: 3,
      required: true,
    },
    {
      name: "category",
      description: "In which category the role should be?",
      type: 3,
      required: true,
    },
  ],
  run: async (client, interaction) => {
    await interaction.deferReply();

    // Fetch the guild settings
    const guildSettings = await Settings.findOne({
      guildId: interaction.guild.id,
    });
    const guildRoles = await Role.findOne({ guildId: interaction.guild.id });

    if (guildSettings?.plan === "Basic" && guildRoles?.roles.length >= 10) {
      const maxRoles = new EmbedBuilder()
        .setDescription(
          `🚫 ${interaction.user}, This server reached the maximum of **10** roles! Upgrade to the \`Pro\` plan or higher to create more roles!`
        )
        .setColor("Red");
      return interaction.editReply({ embeds: [maxRoles] });
    }

    const category = interaction.options.getString("category");
    const name = interaction.options.get("name").value;

    if (!guildRoles?.experiences?.length) {
      return interaction.editReply({
        content: ":x: No experience levels defined for this server.",
      });
    }

    const StringSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("users")
      .setPlaceholder("Select the role experiences")
      .setMinValues(1)
      .setMaxValues(Math.min(4, guildRoles.experiences.length));

    for (const experience of guildRoles.experiences) {
      StringSelectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(
            experience.length >= 4 ? experience : experience.padEnd(4, "_")
          )
          .setValue(experience)
          .setDefault(false)
      );
    }

    const row1 = new ActionRowBuilder().addComponents(StringSelectMenu);

    const response = await interaction.editReply({
      content: "Which experience should be enabled for the role?",
      components: [row1],
    });

    const collectorFilter = (i) => i.user.id === interaction.user.id;

    try {
      const confirmation = await response.awaitMessageComponent({
        filter: collectorFilter,
        time: 120000,
      });

      const modal = new ModalBuilder()
        .setCustomId("newRole_salary_modal")
        .setTitle("➕ | Create a new role");

      for (const selectedExperience of confirmation.values) {
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(selectedExperience)
              .setLabel(`${selectedExperience} hourly salary`)
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
        let uniqueId = generateRandomId();
        let hourlySalary = {};
        const fields = submitted.fields.fields;
        fields.map((experience) => {
          if (!isNaN(experience.value)) {
            hourlySalary[experience.customId] = parseFloat(experience.value);
          } else {
            return submitted.update({
              content: ":x: The inputs need to be a number!",
              components: [],
            });
          }
        });

        if (!guildRoles) {
          const newRole = new Role({
            guildId: interaction.guild.id,
            roles: {
              name: name,
              hourlySalary: hourlySalary,
              category: category,
              id: uniqueId,
            },
            categorys: [category],
          });
          await newRole.save();
        } else {
          while (guildRoles.roles.some((role) => role.id === uniqueId)) {
            uniqueId = generateRandomId();
          }

          if (!guildRoles.categorys.includes(category)) {
            guildRoles.categorys.push(category);
          }

          guildRoles.roles.push({
            name: name,
            hourlySalary: hourlySalary,
            category: category,
            id: uniqueId,
          });

          await guildRoles.save();
        }

        let hourlySalaryString = "";
        for (const [level, salary] of Object.entries(hourlySalary)) {
          if (level && salary !== undefined) {
            hourlySalaryString += `${level}: £${salary}p\n`;
          }
        }

        const embed = new EmbedBuilder()
          .setColor("Green")
          .setDescription("**Successfully created the role!**")
          .addFields(
            {
              name: "<:icon_manage:1337377942883401780> Role name",
              value: "```" + name + "```",
              inline: true,
            },
            {
              name: "<:icon_pound:1337326268139700247> Hourly salary",
              value: "```" + hourlySalaryString + "```",
              inline: true,
            },
            { name: "Category", value: "```" + category + "```", inline: true },
            {
              name: "<:icon_id:1337377956313436210> Role ID",
              value: "```" + uniqueId + "```",
              inline: true,
            }
          );

        await submitted.update({
          content: "",
          embeds: [embed],
          components: [],
        });
      }
    } catch (e) {
      await interaction.editReply({
        content: "Confirmation not received within 2 minutes, cancelling.",
        components: [],
      });
    }
  },
};
