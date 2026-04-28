import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useTheme } from 'styled-components';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

const makeChartConfig = (theme) => ({
  backgroundGradientFrom: theme.colors.surface,
  backgroundGradientTo: theme.colors.surface,
  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  propsForLabels: {
    fontSize: 10,
  },
});

const CHART_COLORS = [
  '#2563eb', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // purple
];

const FILTER_OPTIONS = ['all', 'active', 'recovered'];

// Componente para selector de tipo de gráfico
const ChartTypeSelector = ({ selected, onSelect, isMobile }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const iconSize = isMobile ? 16 : 20;
  const inactiveColor = theme.colors.textSecondary;
  return (
    <View style={styles.chartTypeSelector}>
      <TouchableOpacity
        style={[styles.chartTypeButton, selected === 'pie' && styles.chartTypeButtonActive]}
        onPress={() => onSelect('pie')}
      >
        <MaterialIcons name="pie-chart" size={iconSize} color={selected === 'pie' ? theme.colors.onPrimary : inactiveColor} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.chartTypeButton, selected === 'barH' && styles.chartTypeButtonActive]}
        onPress={() => onSelect('barH')}
      >
        <MaterialCommunityIcons name="chart-bar" size={iconSize} color={selected === 'barH' ? theme.colors.onPrimary : inactiveColor} style={{ transform: [{ rotate: '90deg' }] }} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.chartTypeButton, selected === 'barV' && styles.chartTypeButtonActive]}
        onPress={() => onSelect('barV')}
      >
        <MaterialCommunityIcons name="chart-bar" size={iconSize} color={selected === 'barV' ? theme.colors.onPrimary : inactiveColor} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.chartTypeButton, selected === 'table' && styles.chartTypeButtonActive]}
        onPress={() => onSelect('table')}
      >
        <MaterialIcons name="table-chart" size={iconSize} color={selected === 'table' ? theme.colors.onPrimary : inactiveColor} />
      </TouchableOpacity>
    </View>
  );
};

// Componente para mostrar tabla
const DataTable = ({ data, isMobile }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const total = data.reduce((acc, item) => acc + item.count, 0);
  return (
    <View style={styles.tableContainer}>
      {data.map((item, index) => (
        <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
          <View style={styles.tableCell}>
            <View style={[styles.tableDot, { backgroundColor: item.color }]} />
            <Text style={[styles.tableCellText, isMobile && { fontSize: 11 }]}>{item.name}</Text>
          </View>
          <Text style={[styles.tableCellValue, isMobile && { fontSize: 11 }]}>{item.count}</Text>
          <Text style={[styles.tableCellPercent, isMobile && { fontSize: 11 }]}>
            {total > 0 ? ((item.count / total) * 100).toFixed(1) : 0}%
          </Text>
        </View>
      ))}
      <View style={[styles.tableRow, styles.tableRowTotal]}>
        <Text style={[styles.tableCellTotal, isMobile && { fontSize: 11 }]}>Total</Text>
        <Text style={[styles.tableCellValueTotal, isMobile && { fontSize: 11 }]}>{total}</Text>
        <Text style={[styles.tableCellPercentTotal, isMobile && { fontSize: 11 }]}>100%</Text>
      </View>
    </View>
  );
};

// Componente para gráfico de barras horizontal
const HorizontalBarChart = ({ data, isMobile }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const maxValue = Math.max(...data.map(d => d.count), 1);
  return (
    <View style={styles.horizontalBarContainer}>
      {data.map((item, index) => (
        <View key={index} style={styles.horizontalBarRow}>
          <Text style={[styles.horizontalBarLabel, isMobile && { fontSize: 10, width: 80 }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.horizontalBarTrack}>
            <View
              style={[
                styles.horizontalBarFill,
                { width: `${(item.count / maxValue) * 100}%`, backgroundColor: item.color },
              ]}
            />
          </View>
          <Text style={[styles.horizontalBarValue, isMobile && { fontSize: 10 }]}>{item.count}</Text>
        </View>
      ))}
    </View>
  );
};

// Componente genérico de gráfico
const ChartRenderer = ({ type, data, chartWidth, chartHeight, isMobile, selectedLegend, toggleLegend, t }) => {
  const theme = useTheme();
  const chartConfig = useMemo(() => makeChartConfig(theme), [theme]);
  const filteredData = data.filter(item => !selectedLegend.includes(item.name));

  if (filteredData.length === 0) {
    return (
      <View style={{ height: chartHeight, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.colors.textMuted }}>{t('common.noData')}</Text>
      </View>
    );
  }

  if (type === 'table') {
    return <DataTable data={filteredData} isMobile={isMobile} />;
  }

  if (type === 'barH') {
    return <HorizontalBarChart data={filteredData} isMobile={isMobile} />;
  }

  if (type === 'barV') {
    const barData = {
      labels: filteredData.map(d => d.name.substring(0, 8)),
      datasets: [{
        data: filteredData.map(d => d.count),
        colors: filteredData.map(d => () => d.color),
      }],
    };
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={barData}
          width={Math.max(chartWidth, filteredData.length * 60)}
          height={chartHeight}
          chartConfig={{
            ...chartConfig,
            barPercentage: 0.7,
          }}
          fromZero
          showValuesOnTopOfBars
          withCustomBarColorFromData
          flatColor
          style={{ borderRadius: 8 }}
        />
      </ScrollView>
    );
  }

  // Default: pie chart
  return (
    <PieChart
      data={filteredData}
      width={chartWidth}
      height={chartHeight}
      chartConfig={chartConfig}
      accessor="count"
      backgroundColor="transparent"
      paddingLeft="70"
      absolute
      hasLegend={false}
    />
  );
};

export default function InjuryStatistics() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const injuries = useSelector(state => state.injury.injuries);
  const jugadores = useSelector(state => state.player.players);
  const loading = useSelector(state => state.injury.loading);

  // Filtro global
  const [globalFilter, setGlobalFilter] = useState('all');

  // Tipos de gráfico por sección
  const [chartTypeStatus, setChartTypeStatus] = useState('pie');
  const [chartTypeZone, setChartTypeZone] = useState('pie');
  const [chartTypeType, setChartTypeType] = useState('pie');
  const [chartTypeRelapse, setChartTypeRelapse] = useState('pie');
  const [chartTypePosition, setChartTypePosition] = useState('pie');
  const [chartTypeDuration, setChartTypeDuration] = useState('pie');
  const [chartTypeMonthly, setChartTypeMonthly] = useState('barV');

  const [selectedLegendZone, setSelectedLegendZone] = useState([]);
  const [selectedLegendType, setSelectedLegendType] = useState([]);
  const [selectedLegendRelapse, setSelectedLegendRelapse] = useState([]);
  const [selectedLegendPosition, setSelectedLegendPosition] = useState([]);
  const [selectedLegendMonthly, setSelectedLegendMonthly] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Obtener años disponibles de las lesiones
  const availableYears = useMemo(() => {
    const years = new Set();
    injuries.forEach(injury => {
      if (injury.fechaInicio) {
        years.add(new Date(injury.fechaInicio).getFullYear());
      }
      if (injury.fechaFin) {
        years.add(new Date(injury.fechaFin).getFullYear());
      }
    });
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [injuries]);

  // Texto del filtro para los títulos
  const filterLabel = useMemo(() => {
    return t(`injuryStats.filter.${globalFilter}`);
  }, [globalFilter, t]);

  // Filtrar lesiones según filtro global
  const filteredInjuries = useMemo(() => {
    const today = new Date();
    if (globalFilter === 'active') {
      return injuries.filter(inj => !inj.fechaFin || new Date(inj.fechaFin) > today);
    }
    if (globalFilter === 'recovered') {
      return injuries.filter(inj => inj.fechaFin && new Date(inj.fechaFin) <= today);
    }
    return injuries;
  }, [injuries, globalFilter]);

  // Calcular estadísticas generales
  const stats = useMemo(() => {
    const today = new Date();
    const activas = filteredInjuries.filter(inj => !inj.fechaFin).length;
    const enRecuperacion = filteredInjuries.filter(inj => {
      if (!inj.fechaFin) return false;
      const endDate = new Date(inj.fechaFin);
      return endDate > today;
    }).length;
    const recuperadas = filteredInjuries.filter(inj => {
      if (!inj.fechaFin) return false;
      const endDate = new Date(inj.fechaFin);
      return endDate <= today;
    }).length;

    return {
      activas,
      enRecuperacion,
      recuperadas,
      total: filteredInjuries.length,
    };
  }, [filteredInjuries]);

  // Datos para gráfico de zonas
  const zoneData = useMemo(() => {
    const zoneCounts = {};
    filteredInjuries.forEach(injury => {
      const zone = injury.zona?.value ? t('injury.zones.' + injury.zona.value, injury.zona.label) : t('common.unknown');
      zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    });

    return Object.entries(zoneCounts)
      .map(([name, count], index) => ({
        name,
        count,
        color: CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
      }));
  }, [filteredInjuries, t, theme]);

  // Datos para gráfico de tipos
  const typeData = useMemo(() => {
    const typeCounts = {};
    filteredInjuries.forEach(injury => {
      const type = injury.tipo?.value ? t('injury.types.' + injury.tipo.value, injury.tipo.label) : t('common.unknown');
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([name, count], index) => ({
        name,
        count,
        color: CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
      }));
  }, [filteredInjuries, t, theme]);

  // Datos para gráfico de recaídas
  const relapseData = useMemo(() => {
    const withRelapse = filteredInjuries.filter(inj => inj.recaida).length;
    const withoutRelapse = filteredInjuries.length - withRelapse;

    const data = [];
    if (withoutRelapse > 0) {
      data.push({
        name: t('injuryStats.relapse.new'),
        count: withoutRelapse,
        color: '#10b981',
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
      });
    }
    if (withRelapse > 0) {
      data.push({
        name: t('injuryStats.relapse.relapse'),
        count: withRelapse,
        color: '#f59e0b',
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
      });
    }
    return data;
  }, [filteredInjuries, t, theme]);

  // Datos para gráfico de posiciones
  const positionData = useMemo(() => {
    const positionCounts = {};

    filteredInjuries.forEach(injury => {
      const playerId = injury.jugador?._id || injury.jugador;
      const player = jugadores?.find(p => p._id === playerId);
      const position = player?.posicion || t('common.unknown');
      positionCounts[position] = (positionCounts[position] || 0) + 1;
    });

    return Object.entries(positionCounts)
      .map(([name, count], index) => ({
        name,
        count,
        color: CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
      }));
  }, [filteredInjuries, jugadores, t, theme]);

  // Datos para gráfico de duración
  const durationData = useMemo(() => {
    const durationCounts = { corta: 0, media: 0, larga: 0 };

    filteredInjuries.forEach(injury => {
      if (!injury.fechaInicio || !injury.fechaFin) return;

      const startDate = new Date(injury.fechaInicio);
      const endDate = new Date(injury.fechaFin);
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = diffDays / 30;

      if (diffMonths < 1) {
        durationCounts.corta++;
      } else if (diffMonths <= 3) {
        durationCounts.media++;
      } else {
        durationCounts.larga++;
      }
    });

    return [
      {
        name: t('injuryStats.duration.short'),
        count: durationCounts.corta,
        color: '#10b981',
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
      },
      {
        name: t('injuryStats.duration.medium'),
        count: durationCounts.media,
        color: '#f59e0b',
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
      },
      {
        name: t('injuryStats.duration.long'),
        count: durationCounts.larga,
        color: '#ef4444',
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
      },
    ].filter(item => item.count > 0);
  }, [filteredInjuries, t, theme]);

  // Datos para gráfico de estado
  const statusData = useMemo(() => {
    const data = [];
    if (stats.activas > 0) {
      data.push({
        name: t('injuryStats.summary.active'),
        count: stats.activas,
        color: '#ef4444',
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
      });
    }
    if (stats.enRecuperacion > 0) {
      data.push({
        name: t('injuryStats.status.recovered'),
        count: stats.enRecuperacion,
        color: '#f59e0b',
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
      });
    }
    if (stats.recuperadas > 0) {
      data.push({
        name: t('injuryStats.summary.recovered'),
        count: stats.recuperadas,
        color: '#10b981',
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
      });
    }
    return data;
  }, [stats, t, theme]);

  // Datos para gráfico de lesiones activas por mes
  const monthlyActiveData = useMemo(() => {
    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    const monthlyCounts = new Array(12).fill(0);

    filteredInjuries.forEach(injury => {
      if (!injury.fechaInicio) return;

      const startDate = new Date(injury.fechaInicio);
      const endDate = injury.fechaFin ? new Date(injury.fechaFin) : new Date();

      // Solo considerar lesiones que afectan al año seleccionado
      if (startDate.getFullYear() > selectedYear) return;
      if (endDate.getFullYear() < selectedYear) return;

      // Para cada mes del año, verificar si la lesión estaba activa
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(selectedYear, month, 1);
        const monthEnd = new Date(selectedYear, month + 1, 0);

        // La lesión estaba activa en este mes si:
        // - Comenzó antes o durante este mes Y
        // - Terminó después de que comenzara este mes (o aún no ha terminado)
        if (startDate <= monthEnd && endDate >= monthStart) {
          monthlyCounts[month]++;
        }
      }
    });

    return months.map((name, index) => ({
      name,
      count: monthlyCounts[index],
      color: CHART_COLORS[index % CHART_COLORS.length],
      legendFontColor: theme.colors.textSecondary,
      legendFontSize: 12,
    }));
  }, [filteredInjuries, selectedYear, theme]);

  const toggleLegendZone = (name) => {
    setSelectedLegendZone(prev =>
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  const toggleLegendType = (name) => {
    setSelectedLegendType(prev =>
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  const toggleLegendRelapse = (name) => {
    setSelectedLegendRelapse(prev =>
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  const toggleLegendPosition = (name) => {
    setSelectedLegendPosition(prev =>
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  const toggleLegendMonthly = (name) => {
    setSelectedLegendMonthly(prev =>
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  const isMobile = isMobileDevice();
  const chartWidth = isMobile ? screenWidth - 80 : Math.min(screenWidth * 0.8, 500);
  const chartHeight = isMobile ? 180 : 220;
  const iconSizeLarge = isMobile ? 26 : 32;
  const iconSizeMedium = isMobile ? 20 : 24;
  const iconSizeSmall = isMobile ? 48 : 64;

  if (loading && injuries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('injuryStats.loading')}</Text>
      </View>
    );
  }

  if (injuries.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="insert-chart" size={iconSizeSmall} color={theme.colors.textDisabled} />
          <Text style={styles.emptyTitle}>{t('injuryStats.noInjuries')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('injuryStats.noInjuriesSubtitle')}
          </Text>
        </View>
      </View>
    );
  }

  const renderLegend = (data, selectedLegend, toggleLegend) => {
    return (
      <View style={styles.customLegend}>
        {data.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.legendItem}
            onPress={() => toggleLegend(item.name)}
          >
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: selectedLegend.includes(item.name)
                    ? theme.colors.textDisabled
                    : item.color,
                },
              ]}
            />
            <Text
              style={[
                styles.legendText,
                selectedLegend.includes(item.name) && styles.legendTextInactive,
              ]}
            >
              {item.name}: <Text style={styles.legendValue}>{item.count}</Text>
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filtro Global */}
      <View style={styles.globalFilterContainer}>
        <Text style={[styles.filterLabel, isMobile && { fontSize: 12 }]}>{t('injuryStats.filter.label')}:</Text>
        <View style={styles.filterButtons}>
          {FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.filterButton,
                globalFilter === option && styles.filterButtonActive,
                isMobile && { paddingHorizontal: 10, paddingVertical: 6 }
              ]}
              onPress={() => setGlobalFilter(option)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  globalFilter === option && styles.filterButtonTextActive,
                  isMobile && { fontSize: 11 }
                ]}
              >
                {t(`injuryStats.filter.${option}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Resumen General */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryItem, styles.summaryTotal]}>
            <MaterialIcons name="medical-services" size={iconSizeLarge} color={theme.colors.primary} />
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryValue}>{stats.total}</Text>
              <Text style={styles.summaryLabel}>{t('injuryStats.summary.total')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.summarySmall]}>
            <View style={styles.summaryIconContainer}>
              <View style={[styles.summaryIconBadge, { backgroundColor: theme.colors.errorSoft }]}>
                <MaterialIcons name="error" size={iconSizeMedium} color={theme.colors.error} />
              </View>
            </View>
            <Text style={styles.summarySmallValue}>{stats.activas}</Text>
            <Text style={styles.summarySmallLabel}>{t('injuryStats.summary.active')}</Text>
          </View>

          <View style={[styles.summaryCard, styles.summarySmall]}>
            <View style={styles.summaryIconContainer}>
              <View style={[styles.summaryIconBadge, { backgroundColor: theme.colors.warningSoft }]}>
                <MaterialIcons name="hourglass-empty" size={iconSizeMedium} color={theme.colors.warning} />
              </View>
            </View>
            <Text style={styles.summarySmallValue}>{stats.enRecuperacion}</Text>
            <Text style={styles.summarySmallLabel}>{t('injuryStats.status.recovered')}</Text>
          </View>

          <View style={[styles.summaryCard, styles.summarySmall]}>
            <View style={styles.summaryIconContainer}>
              <View style={[styles.summaryIconBadge, { backgroundColor: theme.colors.successSoft }]}>
                <MaterialIcons name="check-circle" size={iconSizeMedium} color={theme.colors.success} />
              </View>
            </View>
            <Text style={styles.summarySmallValue}>{stats.recuperadas}</Text>
            <Text style={styles.summarySmallLabel}>{t('injuryStats.summary.recovered')}</Text>
          </View>
        </View>
      </View>

      {/* Gráfico de Lesiones Activas por Mes */}
      {monthlyActiveData.some(d => d.count > 0) && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialIcons name="calendar-today" size={iconSizeMedium} color={theme.colors.primary} />
              <Text style={styles.chartTitle}>{t('injuryStats.charts.byMonth')} ({filterLabel})</Text>
            </View>
            <ChartTypeSelector selected={chartTypeMonthly} onSelect={setChartTypeMonthly} isMobile={isMobile} />
          </View>
          {/* Selector de año */}
          <View style={styles.yearSelectorContainer}>
            <Text style={[styles.yearLabel, isMobile && { fontSize: 12 }]}>{t('common.year')}:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={styles.yearButtons}>
                {availableYears.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearButton,
                      selectedYear === year && styles.yearButtonActive,
                      isMobile && { paddingHorizontal: 10, paddingVertical: 5 }
                    ]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text
                      style={[
                        styles.yearButtonText,
                        selectedYear === year && styles.yearButtonTextActive,
                        isMobile && { fontSize: 11 }
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.chartContent}>
            <ChartRenderer
              type={chartTypeMonthly}
              data={monthlyActiveData}
              chartWidth={chartWidth}
              chartHeight={chartHeight}
              isMobile={isMobile}
              selectedLegend={selectedLegendMonthly}
              toggleLegend={toggleLegendMonthly}
              t={t}
            />
            {chartTypeMonthly !== 'table' && renderLegend(monthlyActiveData, selectedLegendMonthly, toggleLegendMonthly)}
          </View>
        </View>
      )}

      {/* Gráfico de Estado */}
      {statusData.length > 0 && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialIcons name="pie-chart" size={iconSizeMedium} color={theme.colors.primary} />
              <Text style={styles.chartTitle}>{t('injuryStats.charts.byStatus')} ({filterLabel})</Text>
            </View>
            <ChartTypeSelector selected={chartTypeStatus} onSelect={setChartTypeStatus} isMobile={isMobile} />
          </View>
          <View style={styles.chartContent}>
            <ChartRenderer
              type={chartTypeStatus}
              data={statusData}
              chartWidth={chartWidth}
              chartHeight={chartHeight}
              isMobile={isMobile}
              selectedLegend={[]}
              toggleLegend={() => {}}
              t={t}
            />
            {chartTypeStatus !== 'table' && (
              <View style={styles.customLegend}>
                {statusData.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>
                      {item.name}: <Text style={styles.legendValue}>{item.count}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Gráfico de Zonas */}
      {zoneData.length > 0 && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="body" size={iconSizeMedium} color={theme.colors.primary} />
              <Text style={styles.chartTitle}>{t('injuryStats.charts.byZone')} ({filterLabel})</Text>
            </View>
            <ChartTypeSelector selected={chartTypeZone} onSelect={setChartTypeZone} isMobile={isMobile} />
          </View>
          <View style={styles.chartContent}>
            <ChartRenderer
              type={chartTypeZone}
              data={zoneData}
              chartWidth={chartWidth}
              chartHeight={chartHeight}
              isMobile={isMobile}
              selectedLegend={selectedLegendZone}
              toggleLegend={toggleLegendZone}
              t={t}
            />
            {chartTypeZone !== 'table' && renderLegend(zoneData, selectedLegendZone, toggleLegendZone)}
          </View>
        </View>
      )}

      {/* Gráfico de Tipos */}
      {typeData.length > 0 && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialIcons name="healing" size={iconSizeMedium} color={theme.colors.primary} />
              <Text style={styles.chartTitle}>{t('injuryStats.charts.byType')} ({filterLabel})</Text>
            </View>
            <ChartTypeSelector selected={chartTypeType} onSelect={setChartTypeType} isMobile={isMobile} />
          </View>
          <View style={styles.chartContent}>
            <ChartRenderer
              type={chartTypeType}
              data={typeData}
              chartWidth={chartWidth}
              chartHeight={chartHeight}
              isMobile={isMobile}
              selectedLegend={selectedLegendType}
              toggleLegend={toggleLegendType}
              t={t}
            />
            {chartTypeType !== 'table' && renderLegend(typeData, selectedLegendType, toggleLegendType)}
          </View>
        </View>
      )}

      {/* Gráfico de Recaídas */}
      {relapseData.length > 0 && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="warning" size={iconSizeMedium} color={theme.colors.primary} />
              <Text style={styles.chartTitle}>{t('injuryStats.charts.byRelapse')} ({filterLabel})</Text>
            </View>
            <ChartTypeSelector selected={chartTypeRelapse} onSelect={setChartTypeRelapse} isMobile={isMobile} />
          </View>
          <View style={styles.chartContent}>
            <ChartRenderer
              type={chartTypeRelapse}
              data={relapseData}
              chartWidth={chartWidth}
              chartHeight={chartHeight}
              isMobile={isMobile}
              selectedLegend={selectedLegendRelapse}
              toggleLegend={toggleLegendRelapse}
              t={t}
            />
            {chartTypeRelapse !== 'table' && renderLegend(relapseData, selectedLegendRelapse, toggleLegendRelapse)}
          </View>
        </View>
      )}

      {/* Gráfico de Posiciones */}
      {positionData.length > 0 && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialIcons name="sports-soccer" size={iconSizeMedium} color={theme.colors.primary} />
              <Text style={styles.chartTitle}>{t('injuryStats.charts.byPosition')} ({filterLabel})</Text>
            </View>
            <ChartTypeSelector selected={chartTypePosition} onSelect={setChartTypePosition} isMobile={isMobile} />
          </View>
          <View style={styles.chartContent}>
            <ChartRenderer
              type={chartTypePosition}
              data={positionData}
              chartWidth={chartWidth}
              chartHeight={chartHeight}
              isMobile={isMobile}
              selectedLegend={selectedLegendPosition}
              toggleLegend={toggleLegendPosition}
              t={t}
            />
            {chartTypePosition !== 'table' && renderLegend(positionData, selectedLegendPosition, toggleLegendPosition)}
          </View>
        </View>
      )}

      {/* Gráfico de Duración */}
      {durationData.length > 0 && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="time" size={iconSizeMedium} color={theme.colors.primary} />
              <Text style={styles.chartTitle}>{t('injuryStats.charts.byDuration')} ({filterLabel})</Text>
            </View>
            <ChartTypeSelector selected={chartTypeDuration} onSelect={setChartTypeDuration} isMobile={isMobile} />
          </View>
          <View style={styles.chartContent}>
            <ChartRenderer
              type={chartTypeDuration}
              data={durationData}
              chartWidth={chartWidth}
              chartHeight={chartHeight}
              isMobile={isMobile}
              selectedLegend={[]}
              toggleLegend={() => {}}
              t={t}
            />
            {chartTypeDuration !== 'table' && (
              <View style={styles.customLegend}>
                {durationData.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>
                      {item.name}: <Text style={styles.legendValue}>{item.count}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      <View style={{ height: isMobile ? 24 : 40 }} />
    </View>
  );
}

const isMobile = isMobileDevice();

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobile ? 24 : 40,
  },
  loadingText: {
    marginTop: isMobile ? 12 : 16,
    fontSize: isMobile ? 14 : 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobile ? 24 : 40,
  },
  emptyTitle: {
    fontSize: isMobile ? 16 : 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: isMobile ? 12 : 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: isMobile ? 12 : 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: isMobile ? 6 : 8,
  },
  // Filtro global
  globalFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isMobile ? 12 : 16,
    paddingTop: isMobile ? 12 : 16,
    paddingBottom: isMobile ? 8 : 12,
    gap: isMobile ? 8 : 12,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: isMobile ? 6 : 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  filterButtonTextActive: {
    color: theme.colors.onPrimary,
  },
  // Chart type selector
  chartTypeSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  chartTypeButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceAlt,
  },
  chartTypeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  // Year selector styles
  yearSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isMobile ? 12 : 16,
    gap: isMobile ? 8 : 12,
  },
  yearLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  yearButtons: {
    flexDirection: 'row',
    gap: isMobile ? 6 : 8,
  },
  yearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  yearButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  yearButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  yearButtonTextActive: {
    color: theme.colors.onPrimary,
  },
  // Table styles
  tableContainer: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  tableRowTotal: {
    backgroundColor: theme.colors.border,
  },
  tableCell: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  tableCellText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  tableCellValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  tableCellPercent: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  tableCellTotal: {
    flex: 2,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tableCellValueTotal: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  tableCellPercentTotal: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  // Horizontal bar chart
  horizontalBarContainer: {
    width: '100%',
    gap: 8,
  },
  horizontalBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  horizontalBarLabel: {
    width: 100,
    fontSize: 11,
    color: theme.colors.text,
    textAlign: 'right',
  },
  horizontalBarTrack: {
    flex: 1,
    height: 20,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  horizontalBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  horizontalBarValue: {
    width: 30,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'left',
  },
  summaryContainer: {
    padding: isMobile ? 12 : 16,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobile ? 10 : 12,
    padding: isMobile ? 12 : 16,
    marginBottom: isMobile ? 10 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryTotal: {
    paddingVertical: isMobile ? 6 : 8,
  },
  summaryTextContainer: {
    marginLeft: isMobile ? 12 : 16,
    flex: 1,
  },
  summaryValue: {
    fontSize: isMobile ? 26 : 32,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  summaryLabel: {
    fontSize: isMobile ? 12 : 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginTop: isMobile ? 2 : 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isMobile ? 8 : 12,
  },
  summarySmall: {
    flex: 1,
    minWidth: isMobile ? '30%' : 150,
    alignItems: 'center',
    paddingVertical: isMobile ? 14 : 20,
  },
  summaryIconContainer: {
    marginBottom: isMobile ? 8 : 12,
  },
  summaryIconBadge: {
    width: isMobile ? 44 : 56,
    height: isMobile ? 44 : 56,
    borderRadius: isMobile ? 22 : 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summarySmallValue: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: isMobile ? 2 : 4,
  },
  summarySmallLabel: {
    fontSize: isMobile ? 10 : 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobile ? 10 : 12,
    padding: isMobile ? 12 : 16,
    marginHorizontal: isMobile ? 12 : 16,
    marginBottom: isMobile ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: isMobile ? 'flex-start' : 'center',
    flexWrap: 'wrap',
    gap: isMobile ? 8 : 0,
    marginBottom: isMobile ? 12 : 16,
    paddingBottom: isMobile ? 10 : 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  chartTitle: {
    fontSize: isMobile ? 14 : 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: isMobile ? 6 : 8,
    flexShrink: 1,
  },
  chartContent: {
    alignItems: 'center',
  },
  customLegend: {
    marginTop: isMobile ? 12 : 16,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isMobile ? 4 : 6,
    paddingHorizontal: isMobile ? 6 : 8,
  },
  legendDot: {
    width: isMobile ? 10 : 12,
    height: isMobile ? 10 : 12,
    borderRadius: isMobile ? 5 : 6,
    marginRight: isMobile ? 6 : 8,
  },
  legendText: {
    fontSize: isMobile ? 11 : 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  legendTextInactive: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  legendValue: {
    fontWeight: '700',
    color: theme.colors.text,
  },
});
