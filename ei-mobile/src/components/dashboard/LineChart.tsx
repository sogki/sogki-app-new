import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import type { InvestmentPoint } from '@/src/lib/types';
import { colors } from '@/src/theme/colors';

type LineChartProps = {
  points: InvestmentPoint[];
  positive?: boolean;
  height?: number;
};

export function LineChart({ points, positive = true, height = 160 }: LineChartProps) {
  if (!points.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No chart data</Text>
      </View>
    );
  }

  const width = 320;
  const padY = 12;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * width;
    const y = padY + (1 - (p.value - min) / range) * (height - padY * 2);
    return { x, y };
  });

  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(' ');
  const area = `${line} L${coords[coords.length - 1].x.toFixed(2)},${height} L${coords[0].x.toFixed(2)},${height} Z`;
  const stroke = positive ? colors.success : colors.danger;
  const fillId = positive ? 'chartFillGood' : 'chartFillBad';

  return (
    <View style={{ height, width: '100%' }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
            <Stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill={`url(#${fillId})`} />
        <Path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r={4}
          fill={stroke}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
