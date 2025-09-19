function calculateBreakTime(worker) {
  const lastAfkIn =
    worker.afkDates.afkIn[worker.afkDates.afkIn.length - 1] || 0;
  const lastAfkOut =
    worker.afkDates.afkOut[worker.afkDates.afkOut.length - 1] || 0;
  return (lastAfkOut - lastAfkIn) / 1000 / 60 / 60;
}

module.exports = calculateBreakTime;
