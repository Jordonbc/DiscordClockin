module.exports = function dateFormat(timestamp) {
  const now = new Date(timestamp);
  const londonTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);

  const timeParts = Object.fromEntries(
    londonTime.map(({ type, value }) => [type, value])
  );

  const day = timeParts.day;
  const month = timeParts.month;
  const year = timeParts.year;
  const hour = timeParts.hour;
  const minute = timeParts.minute;
  const second = timeParts.second;

  return `${day}/${month}/${year}, ${hour}:${minute}:${second}`;
};
