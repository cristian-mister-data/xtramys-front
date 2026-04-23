/**
 * Implementación web de react-native-chart-kit usando SVG nativo.
 * Cubre PieChart, BarChart y LineChart con la API mínima usada en vendor:
 *   - PieChart: data=[{name, <accessor>, color, legendFontColor}], accessor, hasLegend, absolute
 *   - BarChart: data={labels,datasets:[{data,colors?}]}, fromZero, showValuesOnTopOfBars,
 *               withCustomBarColorFromData, chartConfig.{color,labelColor,barPercentage}
 *   - LineChart: data={labels,datasets:[{data,color?}]}, bezier
 * Otros (ProgressChart, ContributionGraph, StackedBarChart) caen al placeholder.
 *
 * Diseñado para ser ligero: sin dependencias externas, SVG inline.
 */
import { View, Text } from 'react-native';

const DEFAULT_PALETTE = [
  '#2474E5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

const pickColor = (item, idx) =>
  item?.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];

// ---------- PieChart -----------------------------------------------------
export function PieChart({
  data = [],
  width = 320,
  height = 220,
  accessor = 'population',
  hasLegend = true,
  absolute = false,
  paddingLeft = '0',
  backgroundColor = 'transparent',
}) {
  const values = data.map((d) => Number(d[accessor]) || 0);
  const total = values.reduce((a, b) => a + b, 0);
  const cx = height / 2 + Number(paddingLeft || 0);
  const cy = height / 2;
  const r = Math.min(height, width) / 2 - 8;

  let acc = 0;
  const slices = data.map((item, idx) => {
    const value = values[idx];
    const frac = total > 0 ? value / total : 0;
    const start = acc;
    const end = acc + frac;
    acc = end;

    if (frac === 0) return null;
    if (frac >= 0.999) {
      // Único: dibujar círculo completo
      return (
        <circle key={idx} cx={cx} cy={cy} r={r} fill={pickColor(item, idx)} />
      );
    }

    const a0 = start * Math.PI * 2 - Math.PI / 2;
    const a1 = end * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = frac > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
    return <path key={idx} d={d} fill={pickColor(item, idx)} />;
  });

  return (
    <View style={{ width, height, backgroundColor, flexDirection: 'row' }}>
      <svg width={height} height={height} viewBox={`0 0 ${height + Number(paddingLeft || 0)} ${height}`}>
        {slices}
      </svg>
      {hasLegend && (
        <View style={{ flex: 1, paddingLeft: 12, justifyContent: 'center' }}>
          {data.map((item, idx) => {
            const value = values[idx];
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <View
                key={idx}
                style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: pickColor(item, idx),
                    marginRight: 6,
                  }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: item?.legendFontColor || '#475569',
                  }}
                  numberOfLines={1}
                >
                  {item?.name || ''} {absolute ? value : `${pct}%`}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ---------- BarChart -----------------------------------------------------
export function BarChart({
  data,
  width = 320,
  height = 220,
  fromZero = true,
  showValuesOnTopOfBars = false,
  withCustomBarColorFromData = false,
  chartConfig = {},
  style,
}) {
  const labels = data?.labels || [];
  const ds = data?.datasets?.[0];
  const values = ds?.data || [];
  const colorFns = ds?.colors || [];
  const fillFromConfig =
    typeof chartConfig.color === 'function' ? chartConfig.color(1) : '#2474E5';
  const labelColor =
    typeof chartConfig.labelColor === 'function'
      ? chartConfig.labelColor(1)
      : '#475569';

  const padX = 36;
  const padTop = showValuesOnTopOfBars ? 22 : 12;
  const padBottom = 28;
  const innerW = Math.max(20, width - padX * 2);
  const innerH = Math.max(20, height - padTop - padBottom);
  const max = Math.max(1, ...values, 0);
  const min = fromZero ? 0 : Math.min(0, ...values);
  const range = max - min || 1;

  const n = values.length || 1;
  const slot = innerW / n;
  const barPct = chartConfig.barPercentage ?? 0.6;
  const barW = slot * barPct;

  return (
    <View style={[{ width, height, backgroundColor: 'transparent' }, style]}>
      <svg width={width} height={height}>
        {/* eje X */}
        <line
          x1={padX}
          y1={padTop + innerH}
          x2={padX + innerW}
          y2={padTop + innerH}
          stroke={labelColor}
          strokeOpacity="0.25"
        />
        {values.map((v, i) => {
          const h = ((v - min) / range) * innerH;
          const x = padX + i * slot + (slot - barW) / 2;
          const y = padTop + innerH - h;
          const fill =
            withCustomBarColorFromData && typeof colorFns[i] === 'function'
              ? colorFns[i](1)
              : fillFromConfig;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} fill={fill} rx="3" />
              {showValuesOnTopOfBars && (
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  fontSize="10"
                  textAnchor="middle"
                  fill={labelColor}
                >
                  {v}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={padTop + innerH + 16}
                fontSize="10"
                textAnchor="middle"
                fill={labelColor}
              >
                {labels[i] ?? ''}
              </text>
            </g>
          );
        })}
      </svg>
    </View>
  );
}

// ---------- LineChart ----------------------------------------------------
export function LineChart({
  data,
  width = 320,
  height = 220,
  bezier = false,
  chartConfig = {},
  style,
}) {
  const labels = data?.labels || [];
  const ds = data?.datasets?.[0];
  const values = ds?.data || [];
  const stroke =
    (typeof ds?.color === 'function' && ds.color(1)) ||
    (typeof chartConfig.color === 'function' && chartConfig.color(1)) ||
    '#2474E5';
  const labelColor =
    typeof chartConfig.labelColor === 'function'
      ? chartConfig.labelColor(1)
      : '#475569';

  const padX = 36;
  const padTop = 12;
  const padBottom = 28;
  const innerW = Math.max(20, width - padX * 2);
  const innerH = Math.max(20, height - padTop - padBottom);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const n = values.length || 1;
  const stepX = innerW / Math.max(1, n - 1);

  const points = values.map((v, i) => {
    const x = padX + i * stepX;
    const y = padTop + innerH - ((v - min) / range) * innerH;
    return [x, y];
  });

  let pathD = '';
  if (points.length) {
    pathD = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i += 1) {
      const [x, y] = points[i];
      if (bezier) {
        const [px, py] = points[i - 1];
        const cx = (px + x) / 2;
        pathD += ` C ${cx} ${py} ${cx} ${y} ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }
    }
  }

  return (
    <View style={[{ width, height }, style]}>
      <svg width={width} height={height}>
        <line
          x1={padX}
          y1={padTop + innerH}
          x2={padX + innerW}
          y2={padTop + innerH}
          stroke={labelColor}
          strokeOpacity="0.25"
        />
        <path d={pathD} fill="none" stroke={stroke} strokeWidth="2" />
        {points.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill={stroke} />
            <text
              x={x}
              y={padTop + innerH + 16}
              fontSize="10"
              textAnchor="middle"
              fill={labelColor}
            >
              {labels[i] ?? ''}
            </text>
          </g>
        ))}
      </svg>
    </View>
  );
}

// ---------- Stubs (raramente usados) ------------------------------------
function Placeholder({ kind, width = 300, height = 200 }) {
  return (
    <View
      style={{
        width,
        height,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 13 }}>{kind} (web)</Text>
    </View>
  );
}

export const ProgressChart = (p) => <Placeholder kind="ProgressChart" {...p} />;
export const ContributionGraph = (p) => <Placeholder kind="ContributionGraph" {...p} />;
export const StackedBarChart = (p) => <Placeholder kind="StackedBarChart" {...p} />;

export default {
  PieChart,
  BarChart,
  LineChart,
  ProgressChart,
  ContributionGraph,
  StackedBarChart,
};
