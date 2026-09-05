export function isVisibleChromaGreen(data, offset) {
  return data[offset + 3] > 16 && data[offset + 1] >= 180 &&
    data[offset] <= 80 && data[offset + 2] <= 80;
}
