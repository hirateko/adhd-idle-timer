export const formatSeconds = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatMs = (ms: number) => {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return formatSeconds(seconds);
};
