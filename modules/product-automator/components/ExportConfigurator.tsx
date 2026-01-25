
import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { ParsedProduct, GlobalAttributeConfig, OdooExportData } from '../types';
import { generateOdooData } from '../utils/csvGenerator';
import { FileDown, Eye, Download, FileText, ChevronRight, AlertCircle, Check, Columns, ArrowLeft } from 'lucide-react';

interface Props {
  products: ParsedProduct[];
  attributeConfigs: Map<string, GlobalAttributeConfig>;
  onBack: () => void;
}

type FileType = keyof OdooExportData;

const FILE_DEFINITIONS: { key: FileType; label: string; description: string }[] = [
  { key: 'attributes', label: '1. Product Attributes', description: 'Defines dimensions (Size, Color, etc.)' },
  { key: 'attributeValues', label: '2. Attribute Values', description: 'Specific values (Small, Red, etc.)' },
  { key: 'productTemplates', label: '3. Product Templates', description: 'Main product cards & configuration' },
  { key: 'productVariants', label: '4. Product Variants', description: 'Specific SKU details & prices' },
];

export const ExportConfigurator: React.FC<Props> = ({ products, attributeConfigs, onBack }) => {
  const [activeFile, setActiveFile] = useState<FileType>('productTemplates');
  const [selectedFiles, setSelectedFiles] = useState<Record<FileType, boolean>>({
    attributes: true,
    attributeValues: true,
    productTemplates: true,
    productVariants: true,
  });

  // Raw data generated from current state
  const rawData: OdooExportData = useMemo(() => {
    return generateOdooData(products, attributeConfigs);
  }, [products, attributeConfigs]);

  // Track enabled columns for each file type
  const [columnConfig, setColumnConfig] = useState<Record<FileType, Record<string, boolean>>>({
    attributes: {},
    attributeValues: {},
    productTemplates: {},
    productVariants: {},
  });

  // Initialize columns on load
  useEffect(() => {
    const newConfig = { ...columnConfig };
    
    (Object.keys(rawData) as FileType[]).forEach(key => {
      const rows = rawData[key];
      if (rows.length > 0) {
        const keys = Object.keys(rows[0]);
        const currentConfig = newConfig[key] || {};
        
        keys.forEach(k => {
          if (currentConfig[k] === undefined) {
             // By default, enable all columns
             currentConfig[k] = true;
          }
        });
        newConfig[key] = currentConfig;
      }
    });
    setColumnConfig(newConfig);
  }, [rawData]);

  const toggleColumn = (file: FileType, column: string) => {
    setColumnConfig(prev => ({
      ...prev,
      [file]: {
        ...prev[file],
        [column]: !prev[file][column]
      }
    }));
  };

  const toggleFileSelection = (file: FileType) => {
    setSelectedFiles(prev => ({ ...prev, [file]: !prev[file] }));
  };

  const getProcessedData = (file: FileType) => {
    const rows = rawData[file];
    const config = columnConfig[file];
    if (!rows || rows.length === 0) return [];
    
    // Filter columns based on config
    return rows.map(row => {
      const newRow: any = {};
      Object.keys(row).forEach(key => {
        if (config[key] !== false) { // Default to true if undefined
          newRow[key] = row[key];
        }
      });
      return newRow;
    });
  };

  const handleDownload = (file: FileType) => {
    const data = getProcessedData(file);
    const csv = Papa.unparse(data);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${file}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    (Object.keys(selectedFiles) as FileType[]).forEach((file, index) => {
      if (selectedFiles[file]) {
        setTimeout(() => {
          handleDownload(file);
        }, index * 500);
      }
    });
  };

  const currentData = getProcessedData(activeFile);
  const allColumns = rawData[activeFile].length > 0 ? Object.keys(rawData[activeFile][0]) : [];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between bg-white dark:bg-zinc-800 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
             <ArrowLeft className="rtl:rotate-180" size={24} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileDown className="text-primary-600 dark:text-primary-400" size={24} />
              Export Configurator
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Review data, select columns, and download Odoo v18 compatible CSV files.
            </p>
          </div>
        </div>
        <button 
          onClick={handleDownloadAll}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-600/20 transition-all"
        >
          <Download size={18} />
          Download Selected
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: File Selection */}
        <div className="w-80 border-e border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-zinc-700">
             <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                 Available Files
             </span>
             <p className="text-[10px] text-gray-400 mt-1">
                 Select files to download. Click on a row to preview/edit columns.
             </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {FILE_DEFINITIONS.map((def) => (
              <div 
                key={def.key} 
                onClick={() => setActiveFile(def.key)}
                className={`
                    group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border
                    ${activeFile === def.key 
                        ? 'bg-white dark:bg-zinc-700 border-primary-500 shadow-sm ring-1 ring-primary-500' 
                        : 'border-transparent hover:bg-gray-100 dark:hover:bg-zinc-700/50'
                    }
                `}
              >
                 <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <input 
                        type="checkbox"
                        checked={selectedFiles[def.key]}
                        onChange={() => toggleFileSelection(def.key)}
                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-zinc-700 dark:border-zinc-600 cursor-pointer"
                    />
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${activeFile === def.key ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-200'}`}>
                            {def.label}
                        </span>
                        {activeFile === def.key && <Eye size={14} className="text-primary-500" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                        {def.description}
                    </p>
                 </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Area: Preview & Columns */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900">
           {/* Toolbar */}
           <div className="px-4 py-2 border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-zinc-700 rounded-lg border border-gray-200 dark:border-zinc-600">
                    <FileText size={14} className="text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        {FILE_DEFINITIONS.find(f => f.key === activeFile)?.label}
                    </span>
                 </div>
                 <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded">
                    {currentData.length} Records
                 </span>
              </div>
              <button 
                onClick={() => handleDownload(activeFile)} 
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                  <Download size={14} /> Download This CSV
              </button>
           </div>

           <div className="flex flex-1 overflow-hidden">
              {/* Preview Table */}
              <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-zinc-900/50">
                  {currentData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                          <AlertCircle size={48} className="mb-4 opacity-30" />
                          <p>No data available to display</p>
                      </div>
                  ) : (
                    <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                            <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0 z-10">
                                <tr>
                                    {Object.keys(currentData[0]).map(header => (
                                        <th 
                                            key={header} 
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-100 dark:divide-zinc-800">
                                {currentData.slice(0, 50).map((row: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        {Object.values(row).map((val: any, vIdx) => (
                                            <td 
                                                key={vIdx} 
                                                className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis"
                                                title={String(val)}
                                            >
                                                {String(val)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {currentData.length > 50 && (
                            <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-200 dark:border-zinc-700">
                                Showing first 50 records only. Full export will contain all data.
                            </div>
                        )}
                    </div>
                  )}
              </div>

              {/* Column Selector Panel */}
              <div className="w-64 border-s border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex flex-col">
                  <div className="p-3 border-b border-gray-200 dark:border-zinc-700 flex items-center gap-2 bg-gray-50 dark:bg-zinc-800">
                      <Columns size={16} className="text-gray-500" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Columns</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                      {allColumns.map(col => (
                          <label 
                            key={col}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${col === 'id' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <input 
                                type="checkbox"
                                checked={columnConfig[activeFile]?.[col] !== false}
                                onChange={() => toggleColumn(activeFile, col)}
                                disabled={col === 'id'}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-zinc-600 dark:bg-zinc-700"
                            />
                            <span className={`text-xs truncate ${col === 'id' ? 'font-bold' : 'font-medium'} text-gray-700 dark:text-gray-300`} title={col}>
                                {col}
                            </span>
                          </label>
                      ))}
                  </div>
                  <div className="p-2 border-t border-gray-200 dark:border-zinc-700 text-center">
                      <span className="text-[10px] text-gray-400">
                          {allColumns.filter(c => columnConfig[activeFile]?.[c] !== false).length} columns active
                      </span>
                  </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
