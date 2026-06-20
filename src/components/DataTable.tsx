import React, { useState, useMemo } from 'react';
import { Dataset, DataColumn, DataType } from '../types';
import { Plus, Trash2, Edit2, Search, ArrowUpDown, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

interface DataTableProps {
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
}

export default function DataTable({ dataset, onUpdateDataset }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Sorting state for table
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Cell editing state
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Cell editing handlers
  const startEditing = (rowIndex: number, colName: string, value: any) => {
    setEditingCell({ rowIndex, colName });
    setEditValue(value !== null && value !== undefined ? String(value) : '');
  };

  const saveCell = (rowIndex: number, colName: string, type: DataType) => {
    if (!editingCell) return;
    
    let typedValue: any = editValue;
    if (type === 'number') {
      const parsed = Number(editValue.replace(/[$,]/g, ''));
      typedValue = isNaN(parsed) || editValue.trim() === '' ? null : parsed;
    } else if (type === 'boolean') {
      typedValue = editValue.toLowerCase() === 'true' || editValue === '1' || editValue.toLowerCase() === 'yes';
    }

    const updatedRows = [...dataset.rows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [colName]: typedValue,
    };

    onUpdateDataset({
      ...dataset,
      rows: updatedRows,
    });
    setEditingCell(null);
  };

  // Column management
  const handleColumnTypeChange = (colName: string, newType: DataType) => {
    // Cast all active cells of that column to the new type
    const updatedRows = dataset.rows.map(row => {
      const val = row[colName];
      if (val === undefined || val === null || val === '') {
        return { ...row, [colName]: newType === 'number' ? null : '' };
      }
      
      let casted: any = val;
      if (newType === 'number') {
        const num = Number(String(val).replace(/[$,]/g, ''));
        casted = isNaN(num) ? null : num;
      } else if (newType === 'boolean') {
        casted = String(val).toLowerCase() === 'true' || String(val) === '1' || String(val).toLowerCase() === 'yes';
      } else if (newType === 'string') {
        casted = String(val);
      }
      
      return { ...row, [colName]: casted };
    });

    const updatedColumns = dataset.columns.map(col => 
      col.name === colName ? { ...col, type: newType } : col
    );

    onUpdateDataset({
      ...dataset,
      columns: updatedColumns,
      rows: updatedRows,
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    const updatedRows = dataset.rows.filter((_, idx) => idx !== rowIndex);
    onUpdateDataset({
      ...dataset,
      rows: updatedRows,
    });
  };

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    dataset.columns.forEach(col => {
      newRow[col.name] = col.type === 'number' ? null : col.type === 'boolean' ? false : '';
    });

    onUpdateDataset({
      ...dataset,
      rows: [newRow, ...dataset.rows],
    });
    
    // Auto-edit first column of newly added row
    if (dataset.columns.length > 0) {
      setEditingCell({ rowIndex: 0, colName: dataset.columns[0].name });
      setEditValue('');
      setCurrentPage(1);
    }
  };

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return dataset.rows;
    const lower = searchTerm.toLowerCase();
    
    return dataset.rows.filter(row => {
      return Object.values(row).some(val => 
        String(val || '').toLowerCase().includes(lower)
      );
    });
  }, [dataset.rows, searchTerm]);

  // Sort matched rows
  const sortedAndFilteredRows = useMemo(() => {
    if (!sortField) return filteredRows;

    const column = dataset.columns.find(c => c.name === sortField);
    const isNumeric = column?.type === 'number';

    const list = [...filteredRows];
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined || valA === null) valA = isNumeric ? -Infinity : '';
      if (valB === undefined || valB === null) valB = isNumeric ? -Infinity : '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredRows, sortField, sortDirection, dataset.columns]);

  // Pagination bounds
  const totalRows = sortedAndFilteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  
  // Safe page pointer check
  const activePage = currentPage > totalPages ? totalPages : currentPage;

  const paginatedRows = useMemo(() => {
    const startIdx = (activePage - 1) * pageSize;
    return sortedAndFilteredRows.slice(startIdx, startIdx + pageSize);
  }, [sortedAndFilteredRows, activePage, pageSize]);

  return (
    <div className="bg-[#090a0f] border border-[#1c1d25] rounded-xl overflow-hidden shadow-2xl flex flex-col h-[650px]" id="datatable-root">
      {/* Table Toolbar Header */}
      <div className="p-4 bg-[#0c0d11]/80 border-b border-[#1c1d25] flex flex-col sm:flex-row items-center justify-between gap-3" id="datatable-toolbar">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="datatable-search-input"
              type="text"
              placeholder="Search table rows..."
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[#060709] border border-[#232431] text-sm text-stone-200 placeholder-stone-605 focus:outline-none focus:border-[#e5c158]/55 transition-all font-sans"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <span className="text-xs text-stone-500 font-mono hidden md:inline">
            {totalRows} matched rows
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            id="datatable-addrow-button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#9f825b] to-[#d4af37] text-stone-955 font-semibold text-xs px-3.5 py-2.5 rounded-lg shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
          
          <div className="flex items-center gap-1.5 bg-[#060709] border border-[#232431] rounded-lg px-2.5 py-1.5 select-none animate-none">
            <span className="text-xs text-stone-400 font-sans">Rows:</span>
            <select
              id="datatable-pagesize-select"
              className="bg-transparent text-xs text-stone-200 border-none focus:outline-none focus:ring-0 font-sans py-0 cursor-pointer font-mono"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="5" className="bg-[#0c0d11]">5</option>
              <option value="10" className="bg-[#0c0d11]">10</option>
              <option value="15" className="bg-[#0c0d11]">15</option>
              <option value="30" className="bg-[#0c0d11]">30</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spreadsheet grid scrollbox */}
      <div className="flex-1 overflow-auto bg-[#060709]/40 relative animate-none" id="datatable-grid">
        <table className="w-full text-left text-xs border-collapse relative">
          <thead className="bg-[#0c0d11]/90 sticky top-0 z-20 backdrop-blur border-b border-[#1c1d25]">
            <tr>
              <th className="p-3 w-12 text-center text-stone-550 font-mono">#</th>
              {dataset.columns.map((col) => (
                <th key={col.name} className="p-3 font-semibold text-stone-300 min-w-[140px] relative group border-r border-[#1c1d25]/60">
                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => handleSort(col.name)}
                      className="flex items-center gap-1 hover:text-stone-100 text-stone-300 transition-all text-left font-serif font-medium"
                    >
                      {col.name}
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-55 hover:opacity-100 text-[#e5c151]" />
                    </button>
                    
                    <select
                      className="text-[10px] bg-[#060709] text-stone-450 border border-[#232431] rounded px-1.5 py-0.5 max-w-[80px] focus:outline-none focus:border-[#e5c158]/55 cursor-pointer"
                      value={col.type}
                      onChange={(e) => handleColumnTypeChange(col.name, e.target.value as DataType)}
                      title="Adjust column casting dataType"
                    >
                      <option value="string">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                </th>
              ))}
              <th className="p-3 w-16 text-center text-stone-500 sticky right-0 bg-[#0c0d11]" style={{ zIndex: 10 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={dataset.columns.length + 2} className="p-8 text-center text-stone-500 text-sm">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 text-stone-750" />
                  No cells matched the search query. Try resetting filters.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, relativeIdx) => {
                // Determine absolute index in dataset rows
                const absoluteIndex = dataset.rows.indexOf(row);
                
                return (
                  <tr key={relativeIdx} className="border-b border-[#1c1d25]/80 hover:bg-[#12131a]/30 group/row transition-all text-stone-300">
                    <td className="p-3 text-center text-xs font-mono text-stone-600 bg-[#060709]/50">
                      {absoluteIndex + 1}
                    </td>
                    
                    {dataset.columns.map((col) => {
                      const value = row[col.name];
                      const isEditing = editingCell && editingCell.rowIndex === absoluteIndex && editingCell.colName === col.name;
                      
                      return (
                        <td
                          key={col.name}
                          className={`p-1.5 border-r border-[#1c1d25]/30 relative cursor-pointer transition-all ${
                            isEditing ? 'bg-[#221f1a]/40 ring-1 ring-[#e5c151]/50' : 'hover:bg-stone-800/15'
                          }`}
                          onClick={() => {
                            if (!isEditing) {
                              startEditing(absoluteIndex, col.name, value);
                            }
                          }}
                        >
                          {isEditing ? (
                            <input
                              className="w-full bg-[#060709] border border-[#e5c158]/80 text-[#f3d995] text-xs rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#e5c158] font-sans"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveCell(absoluteIndex, col.name, col.type)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCell(absoluteIndex, col.name, col.type);
                                  if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center justify-between px-1.5 py-1 min-h-[26px]">
                              <span className={`font-sans truncate ${col.type === 'number' ? 'font-mono text-[#e5c158] text-right w-full' : ''}`}>
                                {col.type === 'number' && typeof value === 'number'
                                  ? value.toLocaleString(undefined, { maximumFractionDigits: 4 })
                                  : col.type === 'boolean'
                                  ? value ? '✅ True' : '❌ False'
                                  : String(value !== null && value !== undefined ? value : '')
                                }
                              </span>
                              <Edit2 className="w-3 h-3 text-stone-600 group-hover:text-[#e5c151] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1.5 animate-none" />
                            </div>
                          )}
                        </td>
                      );
                    })}

                    <td className="p-1 text-center bg-[#060709]/50 sticky right-0 z-10">
                      <button
                        onClick={() => handleDeleteRow(absoluteIndex)}
                        className="p-1 px-2.5 text-stone-600 hover:text-rose-500 hover:bg-rose-950/30 rounded transition-all active:scale-95 cursor-pointer"
                        title="Delete this row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 bg-[#0c0d11] border-t border-[#1c1d25] flex flex-col sm:flex-row items-center justify-between gap-3 text-stone-400 text-xs font-sans animate-none" id="datatable-footer-pagination">
        <span className="text-stone-550">
          Showing <strong className="text-stone-300">{(activePage - 1) * pageSize + 1}</strong> to{' '}
          <strong className="text-stone-300">
            {Math.min(activePage * pageSize, totalRows)}
          </strong>{' '}
          of <strong className="text-stone-300">{totalRows}</strong> records
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={activePage === 1}
            className="p-1.5 px-2.5 rounded-lg bg-[#060709] border border-[#232431] hover:bg-[#121319] text-stone-400 hover:text-stone-200 transition-all disabled:opacity-30 disabled:hover:bg-[#060709] disabled:hover:text-stone-600 cursor-pointer disabled:cursor-not-allowed"
          >
            First
          </button>
          
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={activePage === 1}
            className="flex items-center gap-1 p-1.5 px-2.5 rounded-lg bg-[#060709] border border-[#232431] hover:bg-[#121319] text-stone-400 hover:text-stone-200 transition-all disabled:opacity-30 disabled:hover:bg-[#060709] disabled:hover:text-stone-600 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <span className="px-3 text-stone-400 font-mono select-none">
            {activePage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={activePage === totalPages}
            className="flex items-center gap-1 p-1.5 px-2.5 rounded-lg bg-[#060709] border border-[#232431] hover:bg-[#121319] text-stone-400 hover:text-stone-200 transition-all disabled:opacity-30 disabled:hover:bg-[#060709] disabled:hover:text-stone-600 cursor-pointer disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={activePage === totalPages}
            className="p-1.5 px-2.5 rounded-lg bg-[#060709] border border-[#232431] hover:bg-[#121319] text-stone-400 hover:text-stone-200 transition-all disabled:opacity-30 disabled:hover:bg-[#060709] disabled:hover:text-stone-600 cursor-pointer disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
