module.exports = async (interaction, worker, workers, workerRole) => {
  worker.worked =
    (Date.now() - interaction.message.createdTimestamp) / 1000 / 60 / 60 -
    worker.breakTime;

  const hours_worked = Math.floor(worker.worked);
  const minutes_worked = Math.floor(
    (worker.worked - hours_worked) / 0.01666667
  );

  const hours_break = Math.floor(worker.breakTime);
  const minutes_break = Math.floor(
    (worker.breakTime - hours_break) / 0.01666667
  );

  worker.weeklyWorked += worker.worked;
  worker.dailyWorked += worker.worked;
  worker.totalWorked += worker.worked;

  const hours_weekly = Math.floor(worker.weeklyWorked);
  const minutes_weekly = Math.floor(
    (worker.weeklyWorked - hours_weekly) / 0.01666667
  );

  const hourlyRate = workerRole.hourlySalary.get(worker.experience);

  const salary = Math.floor(worker.worked * hourlyRate * 100) / 100;

  await workers.save();

  return {
    hours_worked,
    minutes_worked,
    hours_break,
    minutes_break,
    hours_weekly,
    minutes_weekly,
    salary,
  };
};
