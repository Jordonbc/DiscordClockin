export interface ClockStatus {
  label: string;
  className: string;
  message: string;
}

let lastClockStatus: ClockStatus = {
  label: "Waiting",
  className: "status-pill status-pill--idle",
  message: "Sign in to manage your shift.",
};

export function getLastClockStatus(): ClockStatus {
  return lastClockStatus;
}

export function setLastClockStatus(status: ClockStatus): void {
  lastClockStatus = status;
}
