import React, { useState, useRef } from 'react';
import { Dataset } from '../types';
import { DEFAULT_DATASETS } from '../defaultData';
import { parseCSVOrTabDelimited, parseJSONData } from '../utils/parser';
import { Plus, Database, FileText, Upload, Sparkles, Check, FileCode, HelpCircle, AlertCircle } from 'lucide-react';

interface SidebarProps {
  datasets: Dataset[];
  selectedDatasetId: string;
  onSelectDatasetId: (id: string) => void;
  onAddCustomDataset: (dataset: Dataset) => void;
  onRemoveCustomDataset: (id: string) => void;
}

export default function Sidebar({
  datasets,
  selectedDatasetId,
  onSelectDatasetId,
  onAddCustomDataset,
  onRemoveCustomDataset
}: SidebarProps) {
  const [panelMode, setPanelMode] = useState<'switch' | 'upload'>('switch');
  const [pasteName, setPasteName] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [pasteType, setPasteType] = useState<'csv' | 'json'>('csv');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Drag and Drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId) || datasets[0];

  const handlePasteImport = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!pasteContent.trim()) {
      setErrorMsg('Please paste some content before importing.');
      return;
    }

    try {
      const name = pasteName.trim() || `Pasted ${pasteType.toUpperCase()} Dataset`;
      let dataset: Dataset;
      
      if (pasteType === 'csv') {
        dataset = parseCSVOrTabDelimited(pasteContent, name);
      } else {
        dataset = parseJSONData(pasteContent, name);
      }

      onAddCustomDataset(dataset);
      // Reset inputs
      setPasteName('');
      setPasteContent('');
      setPanelMode('switch');
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadedFile(e.target.files[0]);
    }
  };

  const handleUploadedFile = (file: File) => {
    setErrorMsg(null);
    const reader = new FileReader();
    const type = file.name.slice((file.name.lastIndexOf('.') - 1 >>> 0) + 2);
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let dataset: Dataset;
        const rawName = file.name.replace(/\.[^/.]+$/, ''); // Strip extension

        if (type.toLowerCase() === 'json') {
          dataset = parseJSONData(text, rawName);
        } else {
          dataset = parseCSVOrTabDelimited(text, rawName);
        }

        onAddCustomDataset(dataset);
        setPanelMode('switch');
      } catch (err) {
        setErrorMsg(`Failed to parse "${file.name}": ${(err as Error).message}`);
      }
    };

    reader.onerror = () => {
      setErrorMsg(`Error reading file ${file.name}`);
    };

    reader.readAsText(file);
  };

  const selectFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full lg:w-80 bg-[#0c0d11] border-r border-[#1c1d25] p-5 flex flex-col h-full overflow-y-auto" id="sidebar-root">
      
      {/* Sidebar Header Category */}
      <div className="flex items-center gap-2 mb-6" id="sidebar-brand">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#9f825b] to-[#d4af37] flex items-center justify-center text-black font-serif font-bold text-sm tracking-wide shadow-md shadow-yellow-950/10">
          D
        </div>
        <div>
          <h1 className="text-base font-serif font-medium text-[#e5c158] tracking-normal">Data Forge</h1>
          <p className="text-[9px] text-stone-400 font-mono tracking-wider">WAREHOUSE CONNECT</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="grid grid-cols-2 bg-[#060709] p-1.5 rounded-lg border border-[#232431] mb-5" id="sidebar-tab-switcher">
        <button
          onClick={() => { setPanelMode('switch'); setErrorMsg(null); }}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium font-sans transition-all cursor-pointer ${
            panelMode === 'switch'
              ? 'bg-gradient-to-r from-[#171821] to-[#252631] text-[#e5c158] border-b border-[#e5c158]/25 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Datasets
        </button>
        <button
          onClick={() => { setPanelMode('upload'); setErrorMsg(null); }}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium font-sans transition-all cursor-pointer ${
            panelMode === 'upload'
              ? 'bg-gradient-to-r from-[#171821] to-[#252631] text-[#e5c158] border-b border-[#e5c158]/25 shadow-sm'
              : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Import Custom
        </button>
      </div>

      {/* Panel Render switcher */}
      {panelMode === 'switch' ? (
        <div className="flex-1 flex flex-col gap-4" id="sidebar-datasets-panel">
          <div className="flex flex-col gap-2.5">
            <span className="text-[9px] font-bold text-stone-500 font-mono tracking-widest uppercase">AVAILABLE COLLECTIONS</span>
            {datasets.map((d) => {
              const isActive = d.id === selectedDatasetId;
              return (
                <div key={d.id} className="relative group">
                  <button
                    onClick={() => onSelectDatasetId(d.id)}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#12131a] border-[#b59250]/40 shadow-lg shadow-yellow-950/5'
                        : 'bg-transparent border-[#1c1d25] hover:bg-[#12131a]/40 hover:border-[#2b2c3a]'
                    }`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg ${
                      isActive ? 'bg-[#211f1c] text-[#e5c158]' : 'bg-[#12131a] text-stone-400'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-stone-300 group-hover:text-white'}`}>
                          {d.name}
                        </h4>
                        {d.isCustom && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-500 border border-amber-500/10 shrink-0 font-mono">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-400 font-sans line-clamp-2 mt-1 leading-snug">
                        {d.description || `Custom parsed dataset containing ${d.rows.length} records.`}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 text-[9px] font-mono text-stone-500">
                        <span>{d.rows.length} rows</span>
                        <span>•</span>
                        <span>{d.columns.length} columns</span>
                      </div>
                    </div>
                  </button>

                  {d.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // safety check to trigger fallback if deleted
                        if (isActive) {
                          const sibling = datasets.find(siblingItem => siblingItem.id !== d.id);
                          if (sibling) onSelectDatasetId(sibling.id);
                        }
                        onRemoveCustomDataset(d.id);
                      }}
                      className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 p-1 text-stone-500 hover:text-rose-500 hover:bg-slate-900 rounded transition-all cursor-pointer"
                      title="Delete this custom import"
                    >
                      <Plus className="w-3.5 h-3.5 rotate-45" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dataset Schema Insight Inspector */}
          {selectedDataset && (
            <div className="mt-auto border-t border-[#1c1d25] pt-4" id="sidebar-schema-panel">
              <span className="text-[9px] font-bold text-stone-500 font-mono tracking-widest block mb-2.5">ACTIVE SCHEMA</span>
              <div className="bg-[#060709] rounded-lg p-3 border border-[#232431] max-h-[180px] overflow-y-auto flex flex-col gap-1">
                {selectedDataset.columns.map((col) => (
                  <div key={col.name} className="flex items-center justify-between text-[11px] py-1 border-b border-stone-100/5 last:border-0 font-mono">
                    <span className="text-stone-300 font-semibold truncate max-w-[140px]">{col.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                      col.type === 'number' ? 'bg-[#221f1a] text-[#e5c158]' :
                      col.type === 'boolean' ? 'bg-stone-900 text-stone-400' :
                      col.type === 'date' ? 'bg-[#1e1c17] text-[#c5a880]' :
                      'bg-stone-900 text-stone-400'
                    }`}>
                      {col.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4" id="sidebar-upload-panel">
          {/* File drag-and-drop / selector area */}
          <div
            className={`border border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-[#e5c158] bg-[#221f1a]/40'
                : 'border-[#232431] hover:border-[#b59250]/40 bg-[#060709]/40'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={selectFileInput}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.tsv,.txt,.json"
              className="hidden"
            />
            <div className="p-3 bg-[#060709] rounded-lg max-w-fit mx-auto mb-3.5 border border-[#232431]">
              <Upload className="w-5 h-5 text-[#e5c158]" />
            </div>
            <h4 className="text-xs font-semibold text-white font-sans">Upload Data File</h4>
            <p className="text-[10px] text-stone-400 font-sans mt-1 leading-snug">
              Drag & drop or <span className="text-[#e5c158] hover:underline cursor-pointer">browse</span>
            </p>
            <p className="text-[9px] text-stone-500 font-sans mt-2">
              Supports standard CSV, TSV or JSON files
            </p>
          </div>

          <div className="flex items-center justify-center select-none pb-1">
            <span className="text-[9px] text-stone-500 font-mono">-- OR PASTE RAW STRING --</span>
          </div>

          <form onSubmit={handlePasteImport} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-stone-400 font-sans">Dataset Name</label>
              <input
                type="text"
                placeholder="e.g. My Website Analytics"
                className="w-full bg-[#060709] border border-[#232431] rounded-lg px-3 py-2 text-xs text-stone-150 placeholder-stone-600 focus:outline-none focus:border-[#e5c158]/50 transition-all font-sans"
                value={pasteName}
                onChange={(e) => setPasteName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-slate-400 font-sans">Format Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPasteType('csv')}
                    className={`text-[9px] px-2 py-1 rounded font-mono cursor-pointer ${
                      pasteType === 'csv'
                        ? 'bg-[#221f1a] text-[#e5c158] border border-[#e5c158]/20'
                        : 'bg-[#060709] text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    CSV/Tab
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasteType('json')}
                    className={`text-[9px] px-2 py-1 rounded font-mono cursor-pointer ${
                      pasteType === 'json'
                        ? 'bg-[#221f1a] text-[#e5c158] border border-[#e5c158]/20'
                        : 'bg-[#060709] text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    JSON Array
                  </button>
                </div>
              </div>
              <textarea
                rows={6}
                placeholder={
                  pasteType === 'csv'
                    ? 'State,Revenue,Conversion_Pct\nCalifornia,48000,2.4\nTexas,32000,1.8\nNew York,41000,2.1'
                    : '[\n  {"State": "California", "Revenue": 48000, "Conversion_Pct": 2.4},\n  {"State": "Texas", "Revenue": 32000, "Conversion_Pct": 1.8}\n]'
                }
                className="w-full bg-[#060709] border border-[#232431] rounded-lg p-3 text-[11px] font-mono whitespace-pre text-stone-300 placeholder-stone-700 focus:outline-none focus:border-[#e5c158]/50 transition-all leading-relaxed"
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 text-[10px] text-rose-400 flex items-start gap-2 select-none leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-[#9f825b] to-[#d4af37] text-stone-950 hover:brightness-110 font-semibold text-xs rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Parse & Load Dataset
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
