import React, { useMemo } from 'react';
import { Dataset, ChartConfiguration, AggregationType } from '../types';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Download, FileText, Sparkles, TrendingUp, HelpCircle, RefreshCw } from 'lucide-react';

interface ChartCanvasProps {
  dataset: Dataset;
  config: ChartConfiguration;
}

export default function ChartCanvas({ dataset, config }: ChartCanvasProps) {
  
  // 1. DYNAMIC DATA PIPELINE: FILTERS, AGGREGATIONS, SORTINGS, LIMITS
  const processedData = useMemo(() => {
    let result = [...dataset.rows];

    // -- A. APPLY FILTERS --
    if (config.filters && config.filters.length > 0) {
      result = result.filter(row => {
        return config.filters.every(rule => {
          const rawVal = row[rule.column];
          if (rule.operator === 'is_empty') {
            return rawVal === undefined || rawVal === null || String(rawVal).trim() === '';
          }
          if (rule.operator === 'is_not_empty') {
            return rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';
          }

          const cellStr = String(rawVal || '').toLowerCase();
          const ruleStr = String(rule.value || '').toLowerCase();

          switch (rule.operator) {
            case 'equals':
              return cellStr === ruleStr;
            case 'not_equals':
              return cellStr !== ruleStr;
            case 'contains':
              return cellStr.includes(ruleStr);
            case 'starts_with':
              return cellStr.startsWith(ruleStr);
            case 'ends_with':
              return cellStr.endsWith(ruleStr);
            case 'greater_than': {
              const fileNum = Number(rawVal);
              const ruleNum = Number(rule.value);
              return !isNaN(fileNum) && !isNaN(ruleNum) && fileNum > ruleNum;
            }
            case 'less_than': {
              const fileNum = Number(rawVal);
              const ruleNum = Number(rule.value);
              return !isNaN(fileNum) && !isNaN(ruleNum) && fileNum < ruleNum;
            }
            default:
              return true;
          }
        });
      });
    }

    // -- B. APPLY AGGREGATION & PIVOT GROUPING --
    if (config.aggregation.enabled && config.aggregation.groupBy) {
      const groupKey = config.aggregation.groupBy;
      const aggType = config.aggregation.aggType;
      
      // Categorize row indices
      const groups: Record<string, Record<string, any>[]> = {};
      result.forEach(row => {
        const groupVal = String(row[groupKey] !== undefined ? row[groupKey] : 'Unknown');
        if (!groups[groupVal]) groups[groupVal] = [];
        groups[groupVal].push(row);
      });

      // Aggregate numerics for each group
      result = Object.keys(groups).map(gVal => {
        const aggregatedRow: Record<string, any> = {
          [groupKey]: gVal,
          // Propagate the xAxisKey if different from groupKey representing the aggregate key label
          [config.xAxisKey]: gVal
        };

        const groupRows = groups[gVal];

        // Process selected Y columns
        config.yAxisKeys.forEach(yKey => {
          // get all numbers
          const numericVals = groupRows
            .map(r => Number(r[yKey]))
            .filter(v => !isNaN(v) && v !== null);

          if (numericVals.length === 0) {
            aggregatedRow[yKey] = aggType === 'count' ? 0 : null;
            return;
          }

          switch (aggType) {
            case 'sum':
              aggregatedRow[yKey] = numericVals.reduce((acc, c) => acc + c, 0);
              break;
            case 'avg':
              aggregatedRow[yKey] = numericVals.reduce((acc, c) => acc + c, 0) / numericVals.length;
              break;
            case 'min':
              aggregatedRow[yKey] = Math.min(...numericVals);
              break;
            case 'max':
              aggregatedRow[yKey] = Math.max(...numericVals);
              break;
            case 'count':
              aggregatedRow[yKey] = groupRows.length;
              break;
          }
        });

        // Also aggregate other numerical keys if needed but focusing on yAxisKeys
        return aggregatedRow;
      });
    }

    // -- C. APPLY SORTING --
    if (config.sorting && config.sorting.column) {
      const { column, order } = config.sorting;
      // Identify column type
      const colObject = dataset.columns.find(c => c.name === column);
      const isNumeric = colObject?.type === 'number';

      result.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        if (valA === undefined || valA === null) valA = isNumeric ? -Infinity : '';
        if (valB === undefined || valB === null) valB = isNumeric ? -Infinity : '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // -- D. LIMIT RECORDS Snappy safety --
    return result.slice(0, config.limit);
  }, [dataset, config]);

  // Dynamic colors mapper
  const getColor = (index: number) => {
    return config.colorPalette[index % config.colorPalette.length];
  };

  // 2. EXPORT EXCEL/CSV FILE HANDLER
  const handleCSVExport = () => {
    if (processedData.length === 0) return;
    const headers = Object.keys(processedData[0]);
    const csvRows = [
      headers.join(','), // CSV header Row
      ...processedData.map(row => 
        headers.map(h => {
          const val = row[h];
          const escaped = String(val !== null && val !== undefined ? val : '').replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dataset.name.toLowerCase().replace(/\s+/g, '_')}_query_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. STATISTICAL OUTLIER / INSIGHT DETECTOR HEURISTICS (Smart AI-like summaries)
  const analyticInsights = useMemo(() => {
    if (processedData.length < 2 || config.yAxisKeys.length === 0) {
      return { msg: 'Add more rows or select numeric configurations to calculate analytics.', type: 'neutral' };
    }

    const firstY = config.yAxisKeys[0];
    const vals = processedData.map(d => Number(d[firstY])).filter(v => !isNaN(v));
    
    if (vals.length === 0) return { msg: 'Insufficient numeric records to compile analytical formulas.', type: 'neutral' };

    const totalSum = vals.reduce((sum, v) => sum + v, 0);
    const average = totalSum / vals.length;
    
    // Max and min value indexes
    let maxIdx = 0;
    let minIdx = 0;
    vals.forEach((v, idx) => {
      if (v > vals[maxIdx]) maxIdx = idx;
      if (v < vals[minIdx]) minIdx = idx;
    });

    const maxLabel = String(processedData[maxIdx][config.xAxisKey] || 'Index ' + maxIdx);
    const minLabel = String(processedData[minIdx][config.xAxisKey] || 'Index ' + minIdx);
    
    const percentageLead = average > 0 ? (((vals[maxIdx] - average) / average) * 105).toFixed(1) : '0';

    return {
      totalSum: totalSum.toLocaleString(undefined, { maximumFractionDigits: 1 }),
      avg: average.toLocaleString(undefined, { maximumFractionDigits: 1 }),
      max: vals[maxIdx].toLocaleString(undefined, { maximumFractionDigits: 1 }),
      maxLabel,
      min: vals[minIdx].toLocaleString(undefined, { maximumFractionDigits: 1 }),
      minLabel,
      headline: `The "${maxLabel}" node represents the absolute peak metric for "${firstY}", reaching ${vals[maxIdx].toLocaleString()} — scoring roughly ${percentageLead}% above the parsed average boundaries of this dataset sequence.`,
      peakLabel: maxLabel,
      troughLabel: minLabel
    };
  }, [processedData, config.xAxisKey, config.yAxisKeys]);

  // 4. CHART ELEMENT RENDER ENGINE
  const renderChart = () => {
    if (processedData.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 font-sans text-center h-[430px]" id="empty-chart-fallback">
          <HelpCircle className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
          <h4 className="text-sm font-semibold text-slate-350">No Plot Attributes</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Data values were trimmed by active Query Filters, or no numeric Y-Series have been selected in the Dimension config panel.
          </p>
        </div>
      );
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-[#0c0d11]/95 border border-[#232431] rounded-lg p-3 shadow-2xl backdrop-blur font-mono text-[11px]" id="chart-hover-tooltip">
            <p className="font-semibold text-[#e5c158] font-sans mb-1.5 border-b border-[#232431] pb-1">{label}</p>
            {payload.map((entry: any, i: number) => (
              <p key={i} className="flex items-center gap-2.5" style={{ color: entry.color || entry.fill }}>
                <span>● {entry.name}:</span>
                <span className="font-bold ml-auto">{entry.value.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
              </p>
            ))}
          </div>
        );
      }
      return null;
    };

    switch (config.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={processedData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1c1d25" />}
              <XAxis dataKey={config.xAxisKey} stroke="#4a4b57" fontSize={11} tickLine={false} dy={8} />
              <YAxis stroke="#4a4b57" fontSize={11} tickLine={false} dx={-8} />
              {config.enableTooltip && <Tooltip content={<CustomTooltip />} />}
              {config.showLegend && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />}
              {config.yAxisKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={getColor(i)}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: getColor(i), strokeWidth: 1 }}
                  activeDot={{ r: 6, fill: '#fff', stroke: getColor(i), strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
              <defs>
                {config.yAxisKeys.map((key, i) => (
                  <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1" key={key}>
                    <stop offset="5%" stopColor={getColor(i)} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={getColor(i)} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1c1d25" />}
              <XAxis dataKey={config.xAxisKey} stroke="#4a4b57" fontSize={11} tickLine={false} dy={8} />
              <YAxis stroke="#4a4b57" fontSize={11} tickLine={false} dx={-8} />
              {config.enableTooltip && <Tooltip content={<CustomTooltip />} />}
              {config.showLegend && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />}
              {config.yAxisKeys.map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={getColor(i)}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#grad-${key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar_grouped':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1c1d25" />}
              <XAxis dataKey={config.xAxisKey} stroke="#4a4b57" fontSize={11} tickLine={false} dy={8} />
              <YAxis stroke="#4a4b57" fontSize={11} tickLine={false} dx={-8} />
              {config.enableTooltip && <Tooltip content={<CustomTooltip />} />}
              {config.showLegend && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />}
              {config.yAxisKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={getColor(i)} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'bar_stacked':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1c1d25" />}
              <XAxis dataKey={config.xAxisKey} stroke="#4a4b57" fontSize={11} tickLine={false} dy={8} />
              <YAxis stroke="#4a4b57" fontSize={11} tickLine={false} dx={-8} />
              {config.enableTooltip && <Tooltip content={<CustomTooltip />} />}
              {config.showLegend && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />}
              {config.yAxisKeys.map((key, i) => (
                <Bar key={key} dataKey={key} stackId="stacked-group" fill={getColor(i)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'bar_horizontal':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={processedData} margin={{ top: 10, right: 20, left: 40, bottom: 20 }}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1c1d25" />}
              <XAxis type="number" stroke="#4a4b57" fontSize={11} tickLine={false} dy={4} />
              <YAxis type="category" dataKey={config.xAxisKey} stroke="#4a4b57" fontSize={11} tickLine={false} dx={-4} width={80} />
              {config.enableTooltip && <Tooltip content={<CustomTooltip />} />}
              {config.showLegend && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />}
              {config.yAxisKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={getColor(i)} radius={[0, 4, 4, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut': {
        const primaryY = config.yAxisKeys[0] || (dataset.columns.find(c => c.type === 'number')?.name) || '';
        if (!primaryY) {
          return (
            <div className="flex items-center justify-center h-full text-slate-500 font-sans">
              Choose a numeric column for slicing metrics.
            </div>
          );
        }

        const pieData = processedData.map(row => ({
          name: String(row[config.xAxisKey] || ''),
          value: Number(row[primaryY] || 0)
        })).filter(item => item.value >= 0);

        const isDonut = config.chartType === 'donut';

        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
              {config.enableTooltip && <Tooltip content={<CustomTooltip />} />}
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                innerRadius={isDonut ? 65 : 0}
                outerRadius={95}
                paddingAngle={isDonut ? 3 : 0}
                dataKey="value"
                label={({ name, percent }) => `${name.substring(0, 8)} (${(percent * 100).toFixed(0)}%)`}
                labelLine={true}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(index)} />
                ))}
              </Pie>
              {config.showLegend && <Legend wrapperStyle={{ fontSize: 10, bottom: 0 }} />}
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case 'scatter': {
        const xKey = config.xAxisKey;
        const yKey = config.yAxisKeys[0];
        const sizeKey = config.yAxisKeys[1] || ''; // Second Y behaves as size!

        const hasNumberedScatterX = dataset.columns.find(c => c.name === xKey)?.type === 'number';

        const scatterData = processedData.map((row, i) => ({
          x: hasNumberedScatterX ? Number(row[xKey]) : i,
          xLabel: String(row[xKey]),
          y: Number(row[yKey] || 0),
          z: sizeKey ? Number(row[sizeKey] || 1) : 100,
          name: String(row[config.xAxisKey] || '')
        }));

        const BubbleTooltip = ({ active, payload }: any) => {
          if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
              <div className="bg-[#0c0d11] border border-[#232431] rounded-lg p-3 shadow-2xl backdrop-blur font-mono text-[11px]">
                <p className="font-semibold text-[#e5c158] font-sans border-b border-[#232431] pb-1 mb-1">{data.name}</p>
                <p className="text-[#e2c151]">● {xKey}: <span className="font-bold text-stone-200">{data.xLabel}</span></p>
                <p className="text-[#c5a880]">● {yKey}: <span className="font-bold text-stone-200">{data.y.toLocaleString()}</span></p>
                {sizeKey && <p className="text-amber-600">● {sizeKey} (Size): <span className="font-bold text-stone-200">{data.z.toLocaleString()}</span></p>}
              </div>
            );
          }
          return null;
        };

        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1c1d25" />}
              <XAxis type="number" dataKey="x" stroke="#4a4b57" name={xKey} fontSize={10} tickFormatter={(v) => scatterData[v]?.xLabel || v} />
              <YAxis type="number" dataKey="y" stroke="#4a4b57" name={yKey} fontSize={10} />
              {sizeKey && <ZAxis type="number" dataKey="z" range={[50, 450]} />}
              {config.enableTooltip && <Tooltip content={<BubbleTooltip />} />}
              <Scatter name="Scatter Metrics" data={scatterData} fill={getColor(0)}>
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(index)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );
      }

      case 'radar': {
        const radarData = processedData.map(row => {
          const item: Record<string, any> = { subject: String(row[config.xAxisKey] || '') };
          config.yAxisKeys.forEach(yKey => {
            item[yKey] = Number(row[yKey] || 0);
          });
          return item;
        });

        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#1c1d25" />
              <PolarAngleAxis dataKey="subject" stroke="#4a4b57" fontSize={10} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#4a4b57" fontSize={9} />
              {config.enableTooltip && <Tooltip content={<CustomTooltip />} />}
              {config.yAxisKeys.map((key, i) => (
                <Radar
                  key={key}
                  name={key}
                  dataKey={key}
                  stroke={getColor(i)}
                  fill={getColor(i)}
                  fillOpacity={0.2}
                />
              ))}
              {config.showLegend && <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />}
            </RadarChart>
          </ResponsiveContainer>
        );
      }

      case 'metric_grid': {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1.5 overflow-y-auto h-full max-h-[420px]" id="metric-grid-container">
            {config.yAxisKeys.map((metricCol, i) => {
              const vals = processedData.map(r => Number(r[metricCol])).filter(n => !isNaN(n));
              if (vals.length === 0) return null;

              const total = vals.reduce((a, b) => a + b, 0);
              const minVal = Math.min(...vals);
              const maxVal = Math.max(...vals);
              const avg = total / vals.length;

              return (
                <div
                  key={metricCol}
                  className="bg-[#0c0d11] border border-[#232431] rounded-xl p-5 hover:border-[#b59250]/30 hover:shadow-lg transition-all flex flex-col justify-between shadow-md"
                  style={{ borderLeft: `3px solid ${getColor(i)}` }}
                >
                  <div>
                    <span className="text-[9px] text-stone-500 font-mono tracking-widest block uppercase">
                      COLUMN METRIC
                    </span>
                    <h4 className="text-xs font-semibold text-stone-300 mt-0.5 truncate leading-tight font-serif">
                      {metricCol}
                    </h4>
                    <div className="mt-4">
                      <span className="text-[10px] text-stone-400 font-sans block">Total aggregated Sum</span>
                      <p className="text-2xl font-semibold font-mono tracking-tight mt-0.5" style={{ color: getColor(i) }}>
                        {total.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-[#1c1d25] pt-3 mt-4 text-[10px] font-mono text-stone-400">
                    <div>
                      <span className="text-stone-500 text-[8px] block">AVG</span>
                      <span className="font-semibold text-stone-300">{avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 text-[8px] block">PEAK</span>
                      <span className="font-semibold text-[#e5c158]">{maxVal.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 text-[8px] block">MIN</span>
                      <span className="font-semibold text-amber-600">{minVal.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-[#090a0f] border border-[#1c1d25] rounded-xl p-5 shadow-2xl flex flex-col gap-6" id="chart-canvas-root">
      
      {/* Visual Canvas Inner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#1c1d25] pb-4 gap-3" id="canvas-header">
        <div>
          <span className="text-[9px] text-[#e5c158] font-mono tracking-widest flex items-center gap-1.5 leading-snug uppercase">
            <span className="w-1.5 h-1.5 bg-[#e5c151] rounded-full animate-pulse" />
            Analytical Engine
          </span>
          <h2 className="text-base font-serif font-medium text-stone-100 mt-1">
            Interactive Plot Matrix
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Plotting <span className="font-semibold text-stone-300 font-mono">"{config.xAxisKey}"</span> as dimension against selected metrics.
          </p>
        </div>

        <button
          onClick={handleCSVExport}
          className="flex items-center gap-1.5 bg-[#060709] hover:bg-[#121319] text-stone-305 border border-[#232431] hover:border-[#b59250]/40 py-2 px-3.5 rounded-lg text-xs font-semibold font-sans shadow-md cursor-pointer transition-all active:scale-98"
          title="Export current sorted/filtered dataset as a CSV report"
        >
          <Download className="w-3.5 h-3.5 text-[#e5c158]" />
          Export Query CSV
        </button>
      </div>

      {/* CORE RENDER FRAME (Height fixed to 460px with container grid) */}
      <div className="h-[360px] md:h-[400px] w-full" id="canvas-frame">
        {renderChart()}
      </div>

      {/* FOOTER METRIC SUMMARY ROW (Only when numbers exist and not table mode) */}
      {processedData.length > 0 && config.chartType !== 'table' && analyticInsights.headline && (
        <div className="border-t border-[#1c1d25] pt-4" id="canvas-analytics-insights-footer">
          <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-[#060709] border border-[#232431]">
            <div className="p-2.5 bg-gradient-to-tr from-[#1e1c17] to-[#121319] text-[#e5c158] rounded-lg border border-[#e5c151]/10 self-start">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-stone-200 font-serif tracking-wide">
                  Statistical Highlights & General Insights
                </span>
                <span className="text-[9px] bg-[#12131a] border border-[#232431] text-stone-500 px-1.5 py-0.5 rounded font-mono">
                  Calculated Live
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed font-sans mt-1.5">
                {analyticInsights.headline}
              </p>

              {/* Min Max pill metrics */}
              <div className="flex flex-wrap items-center gap-2.5 mt-3 text-[10px] font-mono text-stone-500 select-none">
                <span className="flex items-center gap-1 bg-[#12131a]/60 border border-[#232431] px-2.5 py-0.8 rounded-lg">
                  Total sum: <strong className="text-stone-300 font-semibold">{analyticInsights.totalSum}</strong>
                </span>
                <span className="flex items-center gap-1 bg-[#12131a]/60 border border-[#232431] px-2.5 py-0.8 rounded-lg">
                  Average mean: <strong className="text-[#e5c158] font-semibold">{analyticInsights.avg}</strong>
                </span>
                <span className="flex items-center gap-1 bg-[#12131a]/60 border border-[#232431] px-2.5 py-0.8 rounded-lg">
                  Trough lowest: <strong className="text-amber-600 font-semibold">{analyticInsights.min} ({analyticInsights.troughLabel})</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
