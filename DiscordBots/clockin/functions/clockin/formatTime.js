function formatTime(timeZone = "Europe/London") {
  const now = new Date();
  const ukTime = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(now)
    .split(/\/|,|:/);

  const day = ukTime[0].padStart(2, "0");
  const month = ukTime[1].padStart(2, "0");
  const year = ukTime[2];
  const hour = ukTime[3].trim().padStart(2, "0");
  const minute = ukTime[4].padStart(2, "0");
  const second = ukTime[5].padStart(2, "0");

  return [day, month, year, hour, minute, second]; // Return array of padded time parts
}

module.exports = { formatTime };
