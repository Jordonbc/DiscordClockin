const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const connectToDatabase = require("../../utils/database/db.js");
const GuildWorkers = require("../../models/guildWorkers");
const backendApi = require("../../utils/backendApi");

async function loadWorkerFromBackend(guildId, userId) {
  try {
    return await backendApi.getWorker({ guildId, userId });
  } catch (error) {
    console.error("Failed to load worker from backend:", error);
    return null;
  }
}

module.exports = {
  name: "get-user-reports",
  description: "Gets detailed user work reports with visual charts",
  testOnly: true,
  options: [
    {
      name: "user",
      description: "The user to fetch reports for",
      type: 6, // USER type
      required: true,
    },
    {
      name: "timeframe",
      description: "Timeframe for the report",
      type: 3, // STRING type
      required: false,
      choices: [
        { name: "Today", value: "today" },
        { name: "Week", value: "week" },
        { name: "Month", value: "month" },
        { name: "All Time", value: "all" },
      ],
    },
  ],
  callback: async (client, interaction) => {
    await interaction.deferReply();

    const user = interaction.options.getUser("user");
    const guildId = interaction.guild.id;
    const userId = user.id;
    const timeframe = interaction.options.getString("timeframe") || "all";

    let worker = await loadWorkerFromBackend(guildId, userId);

    if (!worker) {
      await connectToDatabase();
      const guildData = await GuildWorkers.findOne({ guildId });
      if (!guildData)
        return interaction.editReply("No data found for this server.");

      worker = guildData.workers.find((w) => w.userId === userId);
    }

    if (!worker)
      return interaction.editReply("No records found for this user.");

    // Filter data based on timeframe
    const now = Date.now();
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now - 30 * 24 * 60 * 60 * 1000).getTime();

    let filteredClockIns = [...(worker.clockDates?.clockIn || [])];
    let filteredClockOuts = [...(worker.clockDates?.clockOut || [])];
    let filteredAfkIns = worker.afkDates?.afkIn || [];
    let filteredAfkOuts = worker.afkDates?.afkOut || [];

    if (timeframe === "today") {
      filteredClockIns = (worker.clockDates?.clockIn || []).filter(
        (time) => time >= startOfDay
      );
      filteredClockOuts = (worker.clockDates?.clockOut || []).filter(
        (time) => time >= startOfDay
      );
      filteredAfkIns =
        worker.afkDates?.afkIn?.filter((time) => time >= startOfDay) || [];
      filteredAfkOuts =
        worker.afkDates?.afkOut?.filter((time) => time >= startOfDay) || [];
    } else if (timeframe === "week") {
      filteredClockIns = (worker.clockDates?.clockIn || []).filter(
        (time) => time >= startOfWeek
      );
      filteredClockOuts = (worker.clockDates?.clockOut || []).filter(
        (time) => time >= startOfWeek
      );
      filteredAfkIns =
        worker.afkDates?.afkIn?.filter((time) => time >= startOfWeek) || [];
      filteredAfkOuts =
        worker.afkDates?.afkOut?.filter((time) => time >= startOfWeek) || [];
    } else if (timeframe === "month") {
      filteredClockIns = (worker.clockDates?.clockIn || []).filter(
        (time) => time >= startOfMonth
      );
      filteredClockOuts = (worker.clockDates?.clockOut || []).filter(
        (time) => time >= startOfMonth
      );
      filteredAfkIns =
        worker.afkDates?.afkIn?.filter((time) => time >= startOfMonth) || [];
      filteredAfkOuts =
        worker.afkDates?.afkOut?.filter((time) => time >= startOfMonth) || [];
    }

    if (filteredClockIns.length === 0) {
      return interaction.editReply(
        `No work sessions found for ${user.username} in the selected timeframe.`
      );
    }

    // Calculate session durations
    const sessionDurations = [];
    const sessionDates = [];
    let totalWorkedTime = 0;

    for (let i = 0; i < filteredClockIns.length; i++) {
      const clockIn = filteredClockIns[i];
      const clockOut = filteredClockOuts[i] || Date.now(); // Use current time if not clocked out

      //   const duration = (clockOut - clockIn) / (1000 * 60 * 60); // Convert to hours
      const duration = (clockOut - clockIn) / (1000 * 60); // Convert to minutes
      sessionDurations.push(duration);
      totalWorkedTime += duration;

      // Format date for label
      const date = new Date(parseInt(clockIn));
      sessionDates.push(`${date.getMonth() + 1}/${date.getDate()}`);
    }

    // Calculate AFK times
    const afkDurations = [];
    let totalAfkTime = 0;

    for (let i = 0; i < filteredAfkIns.length; i++) {
      const afkIn = filteredAfkIns[i];
      const afkOut = filteredAfkOuts[i] || Date.now(); // Use current time if not back from AFK

      const duration = (afkOut - afkIn) / (1000 * 60 * 60); // Convert to hours
      afkDurations.push(duration);
      totalAfkTime += duration;
    }

    // Create work session duration chart
    const sessionChart = {
      type: "bar",
      data: {
        labels: sessionDates,
        datasets: [
          {
            label: "Work Session Duration (hours)",
            data: sessionDurations,
            backgroundColor: "rgba(54, 162, 235, 0.5)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: `Work Sessions for ${user.username}`,
            font: { size: 16 },
          },
          legend: {
            display: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Hours",
            },
          },
        },
      },
    };

    // Create productivity chart (work vs AFK)
    const productiveTime = totalWorkedTime - totalAfkTime;
    const productivityChart = {
      type: "pie",
      data: {
        labels: ["Productive Time", "AFK Time"],
        datasets: [
          {
            data: [productiveTime, totalAfkTime],
            backgroundColor: [
              "rgba(75, 192, 192, 0.6)",
              "rgba(255, 99, 132, 0.6)",
            ],
            borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: "Productivity Breakdown",
            font: { size: 16 },
          },
        },
      },
    };

    // Weekly work pattern chart (if we have enough data)
    let weekdayDistribution = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat

    for (const clockIn of filteredClockIns) {
      const date = new Date(parseInt(clockIn));
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      weekdayDistribution[dayOfWeek]++;
    }

    const weekdayChart = {
      type: "bar",
      data: {
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [
          {
            label: "Number of Work Sessions",
            data: weekdayDistribution,
            backgroundColor: "rgba(153, 102, 255, 0.5)",
            borderColor: "rgba(153, 102, 255, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: "Work Sessions by Day of Week",
            font: { size: 16 },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Number of Sessions",
            },
          },
        },
      },
    };

    // Format work metrics for display
    const formatTime = (hours) => {
      const wholeHours = Math.floor(hours);
      const minutes = Math.round((hours - wholeHours) * 60);
      return `${wholeHours}h ${minutes}m`;
    };

    const timeWorkedText = formatTime(totalWorkedTime);
    const afkTimeText = formatTime(totalAfkTime);
    const productiveTimeText = formatTime(productiveTime);

    // Generate chart URLs
    const sessionChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
      JSON.stringify(sessionChart)
    )}`;
    const productivityChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
      JSON.stringify(productivityChart)
    )}`;
    const weekdayChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
      JSON.stringify(weekdayChart)
    )}`;

    // Create embeds for Discord
    const statsEmbed = new EmbedBuilder()
      .setTitle(`Work Report for ${user.username}`)
      .setDescription(
        `Timeframe: ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`
      )
      .addFields(
        {
          name: "Experience",
          value: worker.experience || "Unknown",
          inline: true,
        },
        { name: "Total Time Worked", value: timeWorkedText, inline: true },
        { name: "Productive Time", value: productiveTimeText, inline: true },
        { name: "AFK Time", value: afkTimeText, inline: true },
        {
          name: "Productivity Rate",
          value: `${
            totalWorkedTime > 0
              ? Math.round((productiveTime / totalWorkedTime) * 100)
              : 0
          }%`,
          inline: true,
        },
        {
          name: "Number of Sessions",
          value: `${filteredClockIns.length}`,
          inline: true,
        },
        {
          name: "Daily Worked",
          value: worker.dailyWorked ? formatTime(worker.dailyWorked) : "0h 0m",
          inline: true,
        },
        {
          name: "Weekly Worked",
          value: worker.weeklyWorked
            ? formatTime(worker.weeklyWorked)
            : "0h 0m",
          inline: true,
        },
        {
          name: "Total Worked (All Time)",
          value: worker.totalWorked ? formatTime(worker.totalWorked) : "0h 0m",
          inline: true,
        }
      )
      .setColor("#0099ff")
      .setTimestamp();

    // Combine session chart and work pattern chart into one image
    const combinedChartConfig = {
      type: "bar",
      data: {
        datasets: [],
      },
      options: {
        layout: {
          padding: 20,
        },
      },
    };

    // Create a combined chart URL with a 2x2 layout
    const combinedChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
      JSON.stringify({
        type: "bar",
        data: sessionChart.data,
        options: {
          ...sessionChart.options,
          layout: {
            padding: 20,
          },
        },
      })
    )}&width=800&height=400`;

    const productivityImageUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
      JSON.stringify({
        type: "pie",
        data: productivityChart.data,
        options: {
          ...productivityChart.options,
          layout: {
            padding: 20,
          },
        },
      })
    )}&width=400&height=400`;

    const weekdayImageUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
      JSON.stringify({
        type: "bar",
        data: weekdayChart.data,
        options: {
          ...weekdayChart.options,
          layout: {
            padding: 20,
          },
        },
      })
    )}&width=800&height=400`;

    // Send the report as an embed with charts as images
    await interaction.editReply({
      embeds: [statsEmbed],
      files: [
        new AttachmentBuilder(combinedChartUrl, { name: "sessions.png" }),
        new AttachmentBuilder(productivityImageUrl, {
          name: "productivity.png",
        }),
        new AttachmentBuilder(weekdayImageUrl, { name: "weekdays.png" }),
      ],
    });
  },
};
