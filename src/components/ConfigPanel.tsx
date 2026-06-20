import React from 'react';
import { Dataset, ChartType, ChartConfiguration, FilterOperator, FilterCriterion, DataType } from '../types';
import { BarChart, LineChart, AreaChart, PieChart, Activity, Sliders, Filter, SortAsc, RefreshCcw, Plus, Trash2, Check, LayoutGrid, Table } from 'lucide-react';

interface ConfigPanelProps {
  dataset: Dataset;
  config: ChartConfiguration;
  onChangeConfig: (newConfig: ChartConfiguration) => void;
}

const PALETTES = [
  { name: 'Imperial Gold', colors: ['#d4af37', '#f3d995', '#c5a880', '#9f825b', '#ecb865', '#eed2a1'] },
  { name: 'Classic Bronze', colors: ['#b89047', '#e8c88c', '#ca8a04', '#dfc394', '#9e752d', '#704c10'] },
  { name: 'Noble Quartz', colors: ['#a78bfa', '#ca8a04', '#ec4899', '#8b5cf6', '#a855f7', '#6366f1'] },
  { name: 'Sleek Platinum', colors: ['#cbd5e1', '#e2e8f0', '#94a3b8', '#64748b', '#f1f5f9', '#475569'] }
];

const CHART_TYPES: { type: ChartType; label: string; icon: React.ComponentType<any> }[] = [
  { type: 'line', label: 'Line Chart', icon: LineChart },
  { type: 'area', label: 'Area Chart', icon: AreaChart },
  { type: 'bar_grouped', label: 'Grouped Bar', icon: BarChart },
  { type: 'bar_stacked', label: 'Stacked Bar', icon: BarChart },
  { type: 'bar_horizontal', label: 'Horizontal Bar', icon: BarChart },
  { type: 'pie', label: 'Pie Chart', icon: PieChart },
  { type: 'donut', label: 'Donut', icon: PieChart },
  { type: 'scatter', label: 'Scatter', icon: Activity },
  { type: 'radar', label: 'Radar Space', icon: Activity },
  { type: 'metric_grid', label: 'KPI Board', icon: LayoutGrid },
  { type: 'table', label: 'Data Table', icon: Table }
];

export default function ConfigPanel({ dataset, config, onChangeConfig }: ConfigPanelProps) {
  
  // Safe extraction of numeric & categorized columns
  const numericColumns = dataset.columns.filter(col => col.type === 'number').map(col => col.name);
  const allColumns = dataset.columns.map(col => col.name);

  const handleChartTypeChange = (chartType: ChartType) => {
    // Some chart types are better with single Y series, but keep general state
    onChangeConfig({
      ...config,
      chartType
    });
  };

  const handleXAxisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({ ...config, xAxisKey: e.target.value });
  };

  const handleYAxisToggle = (colName: string) => {
    let updatedKeys = [...config.yAxisKeys];
    if (updatedKeys.includes(colName)) {
      // Don't allow empty yAxisKeys unless it can't be helped, fallback easily
      updatedKeys = updatedKeys.filter(k => k !== colName);
    } else {
      updatedKeys.push(colName);
    }
    onChangeConfig({ ...config, yAxisKeys: updatedKeys });
  };

  const handlePaletteSelect = (colors: string[]) => {
    onChangeConfig({ ...config, colorPalette: colors });
  };

  // Toggle aggregate pivot
  const handleAggregateToggle = (enabled: boolean) => {
    const defaultGroupBy = allColumns.find(c => c !== config.xAxisKey) || allColumns[0];
    onChangeConfig({
      ...config,
      aggregation: {
        ...config.aggregation,
        enabled,
        groupBy: config.aggregation.groupBy || defaultGroupBy || ''
      }
    });
  };

  const handleAggregateGroupByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({
      ...config,
      aggregation: {
        ...config.aggregation,
        groupBy: e.target.value
      }
    });
  };

  const handleAggregateTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({
      ...config,
      aggregation: {
        ...config.aggregation,
        aggType: e.target.value as any
      }
    });
  };

  // Filters management
  const addFilter = () => {
    const firstCol = allColumns[0] || '';
    const newFilter: FilterCriterion = {
      id: Math.random().toString(36).substr(2, 9),
      column: firstCol,
      operator: 'equals',
      value: ''
    };
    onChangeConfig({
      ...config,
      filters: [...config.filters, newFilter]
    });
  };

  const updateFilter = (id: string, updates: Partial<FilterCriterion>) => {
    const updatedFilters = config.filters.map(filt => 
      filt.id === id ? { ...filt, ...updates } : filt
    );
    onChangeConfig({ ...config, filters: updatedFilters });
  };

  const deleteFilter = (id: string) => {
    const updated = config.filters.filter(filt => filt.id !== id);
    onChangeConfig({ ...config, filters: updated });
  };

  // Sorter
  const handleSortColChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__none__') {
      onChangeConfig({ ...config, sorting: null });
    } else {
      onChangeConfig({
        ...config,
        sorting: {
          column: val,
          order: config.sorting?.order || 'asc'
        }
      });
    }
  };

  const toggleSortOrder = () => {
    if (!config.sorting) return;
    onChangeConfig({
      ...config,
      sorting: {
        ...config.sorting,
        order: config.sorting.order === 'asc' ? 'desc' : 'asc'
      }
    });
  };

  return (
    <div className="w-full xl:w-80 bg-[#0c0d11] border-l border-[#1c1d25] p-5 flex flex-col h-full overflow-y-auto gap-6" id="config-panel-root">
      
      {/* SECTION: CHART PICKER */}
      <div id="section-chart-picker">
        <span className="text-[9px] font-bold text-stone-500 font-mono tracking-widest block mb-2.5 flex items-center gap-1 uppercase">
          <Sliders className="w-3.5 h-3.5 text-[#e5c158]" />
          Visualization Theme
        </span>
        <div className="grid grid-cols-2 gap-1.5" id="chart-types-grid">
          {CHART_TYPES.map((chartItem) => {
            const isSelected = config.chartType === chartItem.type;
            const IconComp = chartItem.icon;
            
            return (
              <button
                key={chartItem.type}
                onClick={() => handleChartTypeChange(chartItem.type)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all max-w-full truncate cursor-pointer ${
                  isSelected
                    ? 'bg-[#181922] border-[#b59250]/55 text-[#e5c158] shadow-md shadow-yellow-950/10'
                    : 'bg-[#060709]/20 border-[#232431] hover:bg-[#060709]/40 text-stone-400 hover:text-stone-205'
                }`}
                title={chartItem.label}
              >
                <IconComp className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-[#e5c158]' : 'text-stone-500'}`} />
                <span className="text-[11px] font-medium font-sans truncate">{chartItem.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION: AXIS CONFIG (Skip if table) */}
      {config.chartType !== 'table' && (
        <div className="flex flex-col gap-4 border-t border-[#1c1d25] pt-4" id="section-axis-mapping">
          <span className="text-[9px] font-bold text-stone-500 font-mono tracking-widest block mb-0.5 uppercase">
            Dimension Mapping
          </span>

          {/* X Axis select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-stone-400 font-sans">
              X-Axis / Category Key
            </label>
            <select
              id="xaxis-select"
              className="w-full bg-[#060709] border border-[#232431] rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#e5c158]/55 transition-all font-mono cursor-pointer"
              value={config.xAxisKey}
              onChange={handleXAxisChange}
            >
              {allColumns.map(col => (
                <option key={col} value={col} className="bg-[#0c0d11]">{col}</option>
              ))}
            </select>
          </div>

          {/* Y Axis Checklist */}
          {config.chartType !== 'metric_grid' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-stone-400 font-sans flex justify-between items-center">
                <span>Y-Axis value metrics</span>
                <span className="text-[9px] text-stone-500 font-mono">Numbers only</span>
              </label>

              {numericColumns.length === 0 ? (
                <div className="p-2 border border-[#232431] rounded text-[10px] text-stone-500 text-center font-sans">
                  No numerical columns found in this dataset to plot. Check table config.
                </div>
              ) : (
                <div className="bg-[#060709]/60 border border-[#232431] rounded-lg p-2.5 max-h-[140px] overflow-y-auto flex flex-col gap-1 font-sans">
                  {numericColumns.map(colName => {
                    const isChecked = config.yAxisKeys.includes(colName);
                    return (
                      <button
                        key={colName}
                        type="button"
                        onClick={() => handleYAxisToggle(colName)}
                        className={`flex items-center gap-2 w-full text-left p-1 text-[11px] font-mono rounded transition-colors group cursor-pointer ${
                          isChecked ? 'text-[#e5c158]' : 'text-stone-400 hover:text-stone-300'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-[#221f1a] border-[#b59250] text-[#e5c158]' 
                            : 'border-[#232431] bg-[#060709] group-hover:border-[#383a4c]'
                        }`}>
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="truncate flex-1">{colName}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION: COLOR PALETTE SELECT */}
      {config.chartType !== 'table' && (
        <div className="border-t border-[#1c1d25] pt-4" id="section-palette">
          <span className="text-[9px] font-bold text-stone-500 font-mono tracking-widest block mb-2.5 uppercase">
            Theme Accent Palette
          </span>
          <div className="flex flex-col gap-2">
            {PALETTES.map((plt) => {
              const isSelected = JSON.stringify(config.colorPalette) === JSON.stringify(plt.colors);
              return (
                <button
                  key={plt.name}
                  onClick={() => handlePaletteSelect(plt.colors)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#181922] border-[#b59250]/40 text-[#e5c158] font-medium'
                      : 'bg-[#060709]/10 border-[#1c1d25] hover:bg-[#060709]/30 text-stone-400'
                  }`}
                >
                  <span className="text-[10px] font-sans truncate">{plt.name}</span>
                  <div className="flex gap-1">
                    {plt.colors.slice(0, 4).map((c, i) => (
                      <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION: AGGREGATION & PIVOT */}
      {config.chartType !== 'table' && (
        <div className="border-t border-[#1c1d25] pt-4 flex flex-col gap-3.5" id="section-aggregation">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-stone-500 font-mono tracking-widest flex items-center gap-1 uppercase">
              <RefreshCcw className="w-3 h-3 text-[#e5c158]" />
              Aggregation Pivot
            </span>
            <button
              onClick={() => handleAggregateToggle(!config.aggregation.enabled)}
              className={`text-[10px] px-2.5 py-1 rounded cursor-pointer font-sans transition-all ${
                config.aggregation.enabled
                  ? 'bg-[#221f1a] hover:bg-[#2b2720] border border-[#e5c158]/20 text-[#e5c158] font-medium'
                  : 'bg-[#060709] border border-[#232431] text-stone-500 hover:text-stone-300'
              }`}
            >
              {config.aggregation.enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {config.aggregation.enabled && (
            <div className="bg-[#060709]/40 border border-[#232431] rounded-xl p-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-stone-400 font-semibold font-sans">Group rows by category</label>
                <select
                  className="w-full bg-[#060709] border border-[#232431] rounded-lg px-2.5 py-1.5 text-[11px] text-stone-300 font-mono cursor-pointer"
                  value={config.aggregation.groupBy}
                  onChange={handleAggregateGroupByChange}
                >
                  {allColumns.map(col => (
                    <option key={col} value={col} className="bg-[#0c0d11]">{col}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-stone-400 font-semibold font-sans">Statistical function</label>
                <select
                  className="w-full bg-[#060709] border border-[#232431] rounded-lg px-2.5 py-1.5 text-[11px] text-stone-300 font-mono cursor-pointer"
                  value={config.aggregation.aggType}
                  onChange={handleAggregateTypeChange}
                >
                  <option value="sum" className="bg-[#0c0d11] font-sans">SUM — Total numeric sums</option>
                  <option value="avg" className="bg-[#0c0d11] font-sans">AVG — Numerical mean</option>
                  <option value="min" className="bg-[#0c0d11] font-sans">MIN — Minimum records</option>
                  <option value="max" className="bg-[#0c0d11] font-sans">MAX — Maximum bounds</option>
                  <option value="count" className="bg-[#0c0d11] font-sans">COUNT — Row tallies</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION: DATA FILTER RULES */}
      <div className="border-t border-[#1c1d25] pt-4" id="section-filters">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[9px] font-bold text-stone-500 font-mono tracking-widest flex items-center gap-1 uppercase">
            <Filter className="w-3.5 h-3.5 text-[#e5c158]" />
            Query Filters ({config.filters.length})
          </span>
          <button
            onClick={addFilter}
            className="flex items-center gap-1 text-[9px] text-[#e5c158] hover:text-[#f2d995] font-sans font-medium hover:underline cursor-pointer bg-[#060709]/50 px-2 py-1 rounded border border-[#232431]"
          >
            <Plus className="w-2.5 h-2.5" />
            Add Rule
          </button>
        </div>

        {config.filters.length === 0 ? (
          <p className="text-[10px] text-stone-500 text-center py-2.5 border border-dashed border-[#232431] rounded-lg font-sans">
            No active matching rules. Visualizing entire dataset.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5" id="filters-list">
            {config.filters.map((filter, index) => (
              <div key={filter.id} className="bg-[#060709] rounded-xl p-2.5 border border-[#232431] flex flex-col gap-2 relative">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[9px] text-stone-500 font-mono">RULE {index + 1}</span>
                  <button
                    onClick={() => deleteFilter(filter.id)}
                    className="p-1 text-stone-500 hover:text-rose-500 hover:bg-[#1a1c22] rounded transition-colors cursor-pointer"
                    title="Remove filter rule"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    className="bg-[#060709] border border-[#232431] rounded px-2 py-1 text-[10px] text-stone-300 font-mono cursor-pointer"
                    value={filter.column}
                    onChange={(e) => updateFilter(filter.id, { column: e.target.value })}
                  >
                    {allColumns.map(col => (
                      <option key={col} value={col} className="bg-[#0c0d11]">{col}</option>
                    ))}
                  </select>

                  <select
                    className="bg-[#060709] border border-[#232431] rounded px-2 py-1 text-[10px] text-stone-300 font-sans cursor-pointer"
                    value={filter.operator}
                    onChange={(e) => updateFilter(filter.id, { operator: e.target.value as FilterOperator })}
                  >
                    <option value="equals" className="bg-[#0c0d11]">Equals</option>
                    <option value="not_equals" className="bg-[#0c0d11]">Does Not Equal</option>
                    <option value="greater_than" className="bg-[#0c0d11]">Greater than (&gt;)</option>
                    <option value="less_than" className="bg-[#0c0d11]">Less than (&lt;)</option>
                    <option value="contains" className="bg-[#0c0d11]">Contains text</option>
                    <option value="starts_with" className="bg-[#0c0d11]">Starts with</option>
                    <option value="ends_with" className="bg-[#0c0d11]">Ends with</option>
                    <option value="is_empty" className="bg-[#0c0d11]">Is Empty</option>
                    <option value="is_not_empty" className="bg-[#0c0d11]">Is Not Empty</option>
                  </select>
                </div>

                {!['is_empty', 'is_not_empty'].includes(filter.operator) && (
                  <input
                    type="text"
                    placeholder="Compare value..."
                    className="w-full bg-[#060709] border border-[#232431] rounded px-2 py-1.5 text-[10px] text-stone-300 placeholder-stone-700 focus:outline-none focus:border-[#e5c158]/50 transition-colors font-sans"
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: ROW SORTING */}
      <div className="border-t border-[#1c1d25] pt-4 flex flex-col gap-2" id="section-sorting">
        <span className="text-[9px] font-bold text-stone-500 font-mono tracking-widest flex items-center gap-1 uppercase">
          <SortAsc className="w-3.5 h-3.5 text-[#e5c158]" />
          Default Sorting Order
        </span>
        
        <div className="flex gap-2">
          <select
            className="flex-1 bg-[#060709] border border-[#232431] rounded-lg px-3 py-2 text-xs text-stone-300 font-mono cursor-pointer"
            value={config.sorting?.column || '__none__'}
            onChange={handleSortColChange}
          >
            <option value="__none__" className="font-sans text-stone-500 italic bg-[#0c0d11]">No custom sort (Default)</option>
            {allColumns.map(col => (
              <option key={col} value={col} className="bg-[#0c0d11]">{col}</option>
            ))}
          </select>

          {config.sorting && (
            <button
              onClick={toggleSortOrder}
              className="px-3 border border-[#232431] rounded-lg bg-[#060709] hover:bg-[#121319] text-[#e5c158] text-xs font-mono transition-colors cursor-pointer flex items-center justify-center font-bold"
              title="Reverse ordering direction"
            >
              {config.sorting.order.toUpperCase()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
