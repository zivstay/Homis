import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BarChartData {
  key: string;
  value: number;
  color: string;
  label: string;
}

interface BarChartProps {
  data: BarChartData[];
  width?: number;
  height?: number;
  barWidth?: number;
  barSpacing?: number;
  showLabels?: boolean;
  showValues?: boolean;
  maxValue?: number;
  horizontal?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 300,
  height = 200,
  barWidth = 30,
  barSpacing = 10,
  showLabels = true,
  showValues = true,
  maxValue,
  horizontal = false,
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  // Calculate max value if not provided
  const calculatedMaxValue = maxValue || Math.max(...data.map(item => item.value));
  
  // Calculate total width/height needed for bars
  const totalBarsWidth = data.length * barWidth + (data.length - 1) * barSpacing;
  const chartPadding = 40;
  const availableWidth = width - chartPadding * 2;
  const availableHeight = height - chartPadding * 2;

  // Render vertical bars
  const renderVerticalBars = () => {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          {[0, 25, 50, 75, 100].map((percentage) => (
            <Text key={percentage} style={styles.axisLabel}>
              {Math.round((calculatedMaxValue * percentage) / 100)}
            </Text>
          ))}
        </View>

        {/* Bars */}
        <View style={styles.barsContainer}>
          {data.map((item, index) => {
            const barHeight = (item.value / calculatedMaxValue) * availableHeight;
            const barPercentage = (item.value / calculatedMaxValue) * 100;
            
            return (
              <View key={item.key} style={styles.barWrapper}>
                {/* Bar */}
                <View
                  style={[
                    styles.bar,
                    {
                      width: barWidth,
                      height: barHeight,
                      backgroundColor: item.color,
                    }
                  ]}
                >
                  {/* Value on top of bar */}
                  {showValues && (
                    <Text style={styles.barValue}>
                      {item.value}
                    </Text>
                  )}
                </View>
                
                {/* Label below bar */}
                {showLabels && (
                  <Text style={styles.barLabel} numberOfLines={2}>
                    {item.label}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Render horizontal bars
  const renderHorizontalBars = () => {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        {/* X-axis labels */}
        <View style={styles.xAxis}>
          {[0, 25, 50, 75, 100].map((percentage) => (
            <Text key={percentage} style={styles.axisLabel}>
              {Math.round((calculatedMaxValue * percentage) / 100)}
            </Text>
          ))}
        </View>

        {/* Bars */}
        <View style={styles.horizontalBarsContainer}>
          {data.map((item, index) => {
            const barWidth = (item.value / calculatedMaxValue) * availableWidth;
            const barPercentage = (item.value / calculatedMaxValue) * 100;
            
            return (
              <View key={item.key} style={styles.horizontalBarWrapper}>
                {/* Label */}
                {showLabels && (
                  <Text style={styles.horizontalBarLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                )}
                
                {/* Bar */}
                <View
                  style={[
                    styles.horizontalBar,
                    {
                      width: barWidth,
                      height: 20,
                      backgroundColor: item.color,
                    }
                  ]}
                >
                  {/* Value inside bar */}
                  {showValues && (
                    <Text style={styles.horizontalBarValue}>
                      {item.value}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return horizontal ? renderHorizontalBars() : renderVerticalBars();
};

const styles = StyleSheet.create({
  chartContainer: {
    position: 'relative',
  },
  yAxis: {
    position: 'absolute',
    left: 0,
    top: 40,
    bottom: 40,
    width: 40,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  xAxis: {
    position: 'absolute',
    bottom: 0,
    left: 40,
    right: 0,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  axisLabel: {
    fontSize: 10,
    color: '#7f8c8d',
  },
  barsContainer: {
    position: 'absolute',
    left: 40,
    top: 40,
    bottom: 40,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  horizontalBarsContainer: {
    position: 'absolute',
    left: 40,
    top: 40,
    bottom: 40,
    right: 0,
    justifyContent: 'space-around',
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  horizontalBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  bar: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  horizontalBar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  barValue: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  horizontalBarValue: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  barLabel: {
    fontSize: 10,
    color: '#2c3e50',
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 50,
  },
  horizontalBarLabel: {
    fontSize: 10,
    color: '#2c3e50',
    marginRight: 10,
    minWidth: 60,
  },
});

export default BarChart; 