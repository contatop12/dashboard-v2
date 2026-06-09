// Single source for recharts colors. Mirrors --chart-* in index.css.
export const CHART_COLORS = ['#F5C518', '#9B8EFF', '#4A9BFF', '#FF6B6B', '#22C55E', '#F97316']

export function chartColor(index) {
  return CHART_COLORS[index % CHART_COLORS.length]
}
