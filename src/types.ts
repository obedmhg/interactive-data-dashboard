export type DataType = 'number' | 'string' | 'boolean' | 'date';

export interface DataColumn {
  name: string;
  type: DataType;
}

export interface Dataset {
  id: string;
  name: string;
  columns: DataColumn[];
  rows: Record<string, any>[];
  description?: string;
  isCustom?: boolean;
}

export type ChartType =
  | 'line'
  | 'bar_grouped'
  | 'bar_stacked'
  | 'bar_horizontal'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'radar'
  | 'metric_grid'
  | 'table';

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count';

export interface AggregationConfig {
  enabled: boolean;
  groupBy: string;
  aggType: AggregationType;
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty';

export interface FilterCriterion {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
}

export interface SortCriterion {
  column: string;
  order: 'asc' | 'desc';
}

export interface ChartConfiguration {
  chartType: ChartType;
  xAxisKey: string;
  yAxisKeys: string[]; // Supports multiple selection for line, bar, area
  scatterSizeKey?: string; // Optional bubble size key for scatter plot
  colorPalette: string[];
  showGrid: boolean;
  showLegend: boolean;
  enableTooltip: boolean;
  aggregation: AggregationConfig;
  filters: FilterCriterion[];
  sorting: SortCriterion | null;
  limit: number;
}
