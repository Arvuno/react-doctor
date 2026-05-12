export const getOverflowGroup = (baseToken: string): string | null => {
  const match = baseToken.match(/^(overflow|overflow-x|overflow-y)-/);
  return match ? match[1] : null;
};
