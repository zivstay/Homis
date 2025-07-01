declare module 'react-native-svg-charts' {
  import { ComponentType } from 'react';
    import { ViewStyle } from 'react-native';

  interface PieChartProps {
    data: any[];
    valueAccessor: (props: { item: any }) => number;
    spacing?: number;
    outerRadius?: string | number;
    innerRadius?: string | number;
    style?: ViewStyle;
  }

  export const PieChart: ComponentType<PieChartProps>;
} 