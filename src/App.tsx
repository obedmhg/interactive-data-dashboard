import React, { useState, useEffect } from 'react';
import { Dataset, ChartConfiguration } from './types';
import { DEFAULT_DATASETS } from './defaultData';
import Sidebar from './components/Sidebar';
import ConfigPanel from './components/ConfigPanel';
import ChartCanvas from './components/ChartCanvas';
import DataTable from './components/DataTable';
import { Layout, LineChart, FileSpreadsheet, Share2, Info, Moon, Clock, RefreshCw, RefreshCcw, HelpCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>(DEFAULT_DATASETS);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(DEFAULT_DATASETS[0].id);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'spreadsheet'>('visualizer');

  // Find active dataset details safely
  const activeDataset = datasets.find(d => d.id === selectedDatasetId) || datasets[0];

  // Helper to dynamically calculate optimal configs for any loaded dataset
  const autoRecommendConfig = (dataset: Dataset): ChartConfiguration => {
    const numericColumns = dataset.columns.filter(col => col.type === 'number').map(col => col.name);
    const allColumns = dataset.columns.map(col => col.name);
    
    // Choose first string/date for X Axis
    const categoryColObj = dataset.columns.find(col => col.type === 'string' || col.type === 'date') || dataset.columns[0];
    const xAxisKey = categoryColObj ? categoryColObj.name : allColumns[0] || '';
    
    // Y metrics Candidates (Numbers only)
    const yAxisKeyCandidates = numericColumns.filter(c => c !== xAxisKey);
    const yAxisKeys = yAxisKeyCandidates.length > 0 
      ? [yAxisKeyCandidates[0]] 
      : (numericColumns.length > 0 ? [numericColumns[0]] : []);

    return {
      chartType: 'line',
      xAxisKey,
      yAxisKeys,
      colorPalette: ['#d4af37', '#f3d995', '#c5a880', '#9f825b', '#ecb865', '#eed2a1'],
      showGrid: true,
      showLegend: true,
      enableTooltip: true,
      aggregation: {
        enabled: false,
        groupBy: xAxisKey,
        aggType: 'sum'
      },
      filters: [],
      sorting: null,
      limit: 100
    };
  };

  // Setup state configuration lazily
  const [configs, setConfigs] = useState<Record<string, ChartConfiguration>>(() => {
    const initialConfigs: Record<string, ChartConfiguration> = {};
    DEFAULT_DATASETS.forEach(d => {
      initialConfigs[d.id] = autoRecommendConfig(d);
    });
    return initialConfigs;
  });

  const activeConfig = configs[selectedDatasetId] || autoRecommendConfig(activeDataset);

  // Sync back config updates
  const handleConfigChange = (newConfig: ChartConfiguration) => {
    setConfigs({
      ...configs,
      [selectedDatasetId]: newConfig
    });
  };

  // Custom Dataset Append
  const handleAddCustomDataset = (newDataset: Dataset) => {
    setDatasets(prev => [newDataset, ...prev]);
    setSelectedDatasetId(newDataset.id);
    setConfigs(prev => ({
      ...prev,
      [newDataset.id]: autoRecommendConfig(newDataset)
    }));
  };

  // Custom Dataset Remove
  const handleRemoveCustomDataset = (id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
    // Clear configs
    const updatedConfigs = { ...configs };
    delete updatedConfigs[id];
    setConfigs(updatedConfigs);
  };

  // Modify spreadsheet cells / update dataset record in state
  const handleUpdateDataset = (updatedDataset: Dataset) => {
    setDatasets(prev => prev.map(d => d.id === updatedDataset.id ? updatedDataset : d));
    // If the columns changed (e.g., datatype override), ensure config xAxis/yAxis doesn't point to invalid names
    const currentConf = configs[updatedDataset.id];
    if (currentConf) {
      const allColNames = updatedDataset.columns.map(c => c.name);
      const isXValid = allColNames.includes(currentConf.xAxisKey);
      const validYKeys = currentConf.yAxisKeys.filter(k => allColNames.includes(k));

      if (!isXValid || validYKeys.length !== currentConf.yAxisKeys.length) {
        setConfigs({
          ...configs,
          [updatedDataset.id]: {
            ...currentConf,
            xAxisKey: isXValid ? currentConf.xAxisKey : (allColNames[0] || ''),
            yAxisKeys: validYKeys
          }
        });
      }
    }
  };

  // Generate template demo CSV copy configuration preset for user quickstart
  const handleLoadDemoCSV = () => {
    const demoCSV = `Department,Representative,Q1_Conversion,Q2_Revenue,Has_Active_Promo
Engineering,Alice,150,45000,true
Marketing,Bob,240,31200,false
Sales,Charlie,310,59000,true
Operations,David,85,21400,false
Engineering,Eve,175,48900,true
Marketing,Frank,210,34000,true`;
    
    const parsed = {
      id: `custom-demo-${Date.now()}`,
      name: 'Quickstart Demo Departmental',
      columns: [
        { name: 'Department', type: 'string' as const },
        { name: 'Representative', type: 'string' as const },
        { name: 'Q1_Conversion', type: 'number' as const },
        { name: 'Q2_Revenue', type: 'number' as const },
        { name: 'Has_Active_Promo', type: 'boolean' as const }
      ],
      rows: [
        { Department: 'Engineering', Representative: 'Alice', Q1_Conversion: 150, Q2_Revenue: 45000, Has_Active_Promo: true },
        { Department: 'Marketing', Representative: 'Bob', Q1_Conversion: 240, Q2_Revenue: 31200, Has_Active_Promo: false },
        { Department: 'Sales', Representative: 'Charlie', Q1_Conversion: 310, Q2_Revenue: 59000, Has_Active_Promo: true },
        { Department: 'Operations', Representative: 'David', Q1_Conversion: 85, Q2_Revenue: 21400, Has_Active_Promo: false },
        { Department: 'Engineering', Representative: 'Eve', Q1_Conversion: 175, Q2_Revenue: 48900, Has_Active_Promo: true },
        { Department: 'Marketing', Representative: 'Frank', Q1_Conversion: 210, Q2_Revenue: 34000, Has_Active_Promo: true }
      ],
      description: 'Departmental conversion metrics and secondary operational revenues.',
      isCustom: true
    };

    handleAddCustomDataset(parsed);
  };

  return (
    <div className="flex flex-col h-screen bg-[#070709] font-sans text-stone-100 antialiased overflow-hidden" id="app-root">
      
      {/* 1. APP NAVBAR TOP PANEL */}
      <header className="h-16 shrink-0 bg-[#0c0d11] border-b border-[#1c1d25] px-6 flex items-center justify-between select-none" id="app-navbar">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#9f825b] to-[#d4af37] flex items-center justify-center text-black font-semibold shadow-lg shadow-yellow-950/10">
            <Layout className="w-5 h-5 text-stone-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-serif font-semibold tracking-wide text-[#e5c158] italic">
                Interactive Analytical Dashboard
              </h1>
              <span className="text-[9px] bg-[#1a1b24] border border-[#2e303d] text-[#e5c158] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                v2.0
              </span>
            </div>
            <p className="text-[10px] text-stone-400 font-sans mt-0.5">
              Multi-dimensional visualization engine with modular spreadsheets, custom filters, and statistical forecasting.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quickstart generator button */}
          <button
            onClick={handleLoadDemoCSV}
            className="hidden md:flex items-center gap-1.5 bg-[#171821] text-stone-300 border border-[#2b2c3a] hover:border-[#b59250]/45 hover:text-white text-xs font-medium px-3.5 py-2 rounded-lg cursor-pointer transition-all active:scale-98"
            title="Load an instanced Departmental Dataset as a quick sandbox"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e5c158] animate-pulse" />
            Quick Demo Sandbox
          </button>

          {/* Localized timezone stamps */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-400 bg-[#12131a] border border-[#232431] px-3 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-[#e5c158]" />
            <span>SESSION: 2026-06-19 16:50 (LOCAL)</span>
          </div>
        </div>
      </header>

      {/* 2. CORE WORKSPACE AREA */}
      <div className="flex flex-1 overflow-hidden" id="workspace-layout">
        
        {/* LEFT COMPONENT COLUMN: DATA SWITCHER */}
        <Sidebar
          datasets={datasets}
          selectedDatasetId={selectedDatasetId}
          onSelectDatasetId={setSelectedDatasetId}
          onAddCustomDataset={handleAddCustomDataset}
          onRemoveCustomDataset={handleRemoveCustomDataset}
        />

        {/* CENTER COMPONENT FIELD: CANVAS VIEW & SPREADSHEET MANAGER */}
        <main className="flex-1 overflow-hidden flex flex-col p-6 min-w-0 bg-[#090a0f]" id="main-canvas">
          
          {/* Internal Workspace Segment Controller */}
          <div className="flex items-center justify-between border-b border-[#1c1d25] pb-4 mb-5" id="workspace-controls">
            <div className="flex items-center gap-1 bg-[#0c0d11] border border-[#232431] p-1 rounded-xl" id="view-tabs">
              <button
                onClick={() => setActiveTab('visualizer')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
                  activeTab === 'visualizer'
                    ? 'bg-[#181922] text-[#e5c158] border-b border-[#e5c158]/30 shadow-sm shadow-[#ebb046]/5'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <LineChart className="w-4 h-4 text-[#e5c158]" />
                Plot Visualizer
              </button>
              <button
                onClick={() => setActiveTab('spreadsheet')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
                  activeTab === 'spreadsheet'
                    ? 'bg-[#181922] text-[#e5c158] border-b border-[#e5c158]/30 shadow-sm shadow-[#ebb046]/5'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-[#e5c158]" />
                Spreadsheet Editor
              </button>
            </div>

            <div className="flex items-center gap-2" id="quick-insight-counter">
              <span className="text-[10px] text-stone-500 font-mono hidden md:inline">
                COMPILING {activeDataset.rows.length} ROWS X {activeDataset.columns.length} COLS
              </span>
            </div>
          </div>

          {/* ACTIVE VIEW CANVAS CONTAINER */}
          <div className="flex-1 overflow-hidden flex gap-5" id="canvas-split-grid">
            {activeTab === 'visualizer' ? (
              <>
                {/* Visual Graphic Representation */}
                <ChartCanvas
                  dataset={activeDataset}
                  config={activeConfig}
                />
                
                {/* Floating Query Controls sidebar to make full width use of large screens */}
                <ConfigPanel
                  dataset={activeDataset}
                  config={activeConfig}
                  onChangeConfig={handleConfigChange}
                />
              </>
            ) : (
              <div className="flex-1 overflow-hidden" id="spreadsheet-container">
                <DataTable
                  dataset={activeDataset}
                  onUpdateDataset={handleUpdateDataset}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
