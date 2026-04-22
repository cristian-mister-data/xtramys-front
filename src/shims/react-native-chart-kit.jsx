/**
 * Shim mínimo de react-native-chart-kit para web.
 * Renderiza un placeholder con la información del dataset hasta que se reemplace
 * por una librería web real (recharts/chart.js). NO lanza errores: la app sigue
 * funcionando aunque las gráficas no se vean exactamente igual.
 *
 * Exporta: PieChart, BarChart, LineChart, ProgressChart, ContributionGraph, StackedBarChart.
 */
import { View, Text } from 'react-native';

function Placeholder({ kind, width = 300, height = 200 }) {
  return (
    <View style={{
      width, height,
      backgroundColor: '#f1f5f9',
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    }}>
      <Text style={{ color: '#64748b', fontSize: 13 }}>{kind} (web)</Text>
    </View>
  );
}

export const PieChart = (props) => <Placeholder kind="PieChart" {...props} />;
export const BarChart = (props) => <Placeholder kind="BarChart" {...props} />;
export const LineChart = (props) => <Placeholder kind="LineChart" {...props} />;
export const ProgressChart = (props) => <Placeholder kind="ProgressChart" {...props} />;
export const ContributionGraph = (props) => <Placeholder kind="ContributionGraph" {...props} />;
export const StackedBarChart = (props) => <Placeholder kind="StackedBarChart" {...props} />;

export default { PieChart, BarChart, LineChart, ProgressChart, ContributionGraph, StackedBarChart };
