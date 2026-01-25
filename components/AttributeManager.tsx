import React, { useState, useMemo, useEffect } from 'react';
import { ParsedProduct, GlobalAttributeConfig, AttributeCreationMode, AttributeDisplayType } from '../types';
import { Tags, Edit2, Check, Search, Settings, Palette, List, Type, MousePointerClick, Package, X, Barcode, ChevronDown } from 'lucide-react';

interface Props {
  products: ParsedProduct[];
  attributeConfigs: Map<string, GlobalAttributeConfig>;
  onUpdateAttributeName: (oldName: string, newName: string) => void;
  onUpdateAttributeValue: (attrName: string, oldValue: string, newValue: string) => void;
  onUpdateAttributeConfig: (attrName: string, config: GlobalAttributeConfig) => void;
  externalSearchTerm?: string;
}

export const AttributeManager: React.FC<Props> = ({ products, attributeConfigs, onUpdateAttributeName, onUpdateAttributeValue, onUpdateAttributeConfig, externalSearchTerm }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAttr, setEditingAttr] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<{ attr: string, val: string } | null>(null);
  const [tempName, setTempName] = useState('');
  
  // State for Value Inspection Modal
  const [inspectedValue, setInspectedValue] = useState<{ attr: string, val: string } | null>(null);

  useEffect(() => {
    if (externalSearchTerm !== undefined) {
      setSearchTerm(externalSearchTerm);
    }
  }, [externalSearchTerm]);

  const attributesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    products.forEach(p => {
      p.attributes.forEach(a => {
        if (!map.has(a.name)) map.set(a.name, new Set());
        map.get(a.name)?.add(a.value);
      });
    });
    return map;
  }, [products]);

  const sortedAttributes = useMemo(() => {
    return Array.from(attributesMap.entries())
      .map(([name, valuesSet]) => ({
        name,
        values: Array.from(valuesSet).sort(),
        config: attributeConfigs.get(name) || { displayType: 'select', creationMode: 'always' } as GlobalAttributeConfig
      }))
      .filter(attr => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          attr.name.toLowerCase().includes(q) ||
          attr.values.some((v: string) => v.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [attributesMap, searchTerm, attributeConfigs]);

  // Derived state for the modal
  const associatedProducts = useMemo(() => {
      if (!inspectedValue) return [];
      return products.filter(p => 
          p.attributes.some(a => a.name === inspectedValue.attr && a.value === inspectedValue.val)
      );
  }, [inspectedValue, products]);

  const startEditAttr = (name: string) => {
    setEditingAttr(name);
    setTempName(name);
  };

  const saveAttr = () => {
    if (editingAttr && tempName.trim() && tempName !== editingAttr) {
      onUpdateAttributeName(editingAttr, tempName.trim());
    }
    setEditingAttr(null);
  };

  const startEditValue = (attr: string, val: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening modal
    setEditingValue({ attr, val });
    setTempName(val);
  };

  const saveValue = () => {
    if (editingValue && tempName.trim() && tempName !== editingValue.val) {
      onUpdateAttributeValue(editingValue.attr, editingValue.val, tempName.trim());
    }
    setEditingValue(null);
  };

  const handleValueClick = (attr: string, val: string) => {
      if (editingValue) return;
      setInspectedValue({ attr, val });
  };

  const formatPrice = (val: number) => new Intl.NumberFormat('en-US').format(val);

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-zinc-900/50 overflow-hidden font-sans relative">
       {/* Modal Overlay for Product Inspection */}
       {inspectedValue && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-zinc-700">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                            <Tags size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Associated Products</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{inspectedValue.attr}:</span>
                                <span className="px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-100 dark:border-cyan-800">
                                    {inspectedValue.val}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setInspectedValue(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-zinc-900/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {associatedProducts.map(p => (
                            <div key={p.id} className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 hover:border-cyan-200 dark:hover:border-cyan-800 hover:shadow-md transition-all duration-200 flex flex-col gap-3 group">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <div className="p-2 bg-gray-100 dark:bg-zinc-700 rounded-lg text-gray-500 dark:text-gray-400 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-900/20 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                            <Package size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1 line-clamp-2">
                                                {p.templateName}
                                            </h3>
                                            <div className="flex flex-wrap gap-1">
                                                {p.attributes.filter(a => a.name !== inspectedValue?.attr).map((a, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-600">
                                                        {a.name}: {a.value}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <div className="font-mono font-bold text-cyan-700 dark:text-cyan-400 text-sm">
                                            {formatPrice(p.price || 0)} <span className="text-[10px] text-gray-400">{p.currency}</span>
                                        </div>
                                        {p.defaultCode && (
                                            <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700 px-1.5 rounded mt-1 inline-block">
                                                {p.defaultCode}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="h-px bg-gray-100 dark:bg-zinc-700" />
                                
                                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                        <Barcode size={14} />
                                        <span className="font-mono">{p.barcode || 'No Barcode'}</span>
                                    </div>
                                    <span>
                                        Tracking: <span className="font-medium text-gray-700 dark:text-gray-300">{p.tracking}</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
         </div>
       )}

       {/* Top Toolbar */}
       <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-700 px-6 py-3 flex justify-between items-center">
         <div className="relative w-72">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
            </div>
            <input
                type="text"
                placeholder="Search attributes & values..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full ps-9 pe-3 py-2 bg-gray-50 dark:bg-zinc-700/50 border border-gray-200 dark:border-zinc-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-start"
            />
         </div>
         <div className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700 px-2 py-1 rounded-md">
            {sortedAttributes.length} Attribute(s)
         </div>
       </div>

      {/* Main Grid Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedAttributes.map((attr) => (
                <div key={attr.name} className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden group">
                    
                    {/* Card Header */}
                    <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-700/30 border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="p-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 rounded-md text-cyan-600 dark:text-cyan-400">
                                <Tags size={14} />
                            </div>
                            
                            {editingAttr === attr.name ? (
                                <div className="flex items-center gap-1 flex-1">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={tempName}
                                        onChange={(e) => setTempName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && saveAttr()}
                                        onBlur={saveAttr}
                                        className="w-full text-sm font-bold bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border border-cyan-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                                    />
                                    <button onClick={saveAttr} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"><Check size={14} /></button>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => startEditAttr(attr.name)}
                                    className="flex items-center gap-2 cursor-pointer group/title flex-1 min-w-0"
                                >
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate" title={attr.name}>{attr.name}</h3>
                                    <Edit2 size={12} className="text-gray-400 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </div>
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-zinc-700/50 px-2 py-0.5 rounded-full">
                            {attr.values.length} Values
                        </span>
                    </div>

                    {/* Settings Area */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 grid grid-cols-2 gap-4">
                        
                        {/* Creation Mode */}
                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                <Settings size={10} /> Creation
                            </label>
                            <div className="relative">
                                <select 
                                    value={attr.config.creationMode}
                                    onChange={(e) => onUpdateAttributeConfig(attr.name, { ...attr.config, creationMode: e.target.value as AttributeCreationMode })}
                                    className="w-full appearance-none bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg py-1.5 ps-2 pe-6 focus:outline-none focus:border-cyan-500 focus:bg-white dark:focus:bg-zinc-600 transition-colors cursor-pointer"
                                >
                                    <option value="always">Instantly</option>
                                    <option value="dynamic">Dynamically</option>
                                    <option value="no_variant">Never</option>
                                </select>
                                <ChevronDown size={12} className="absolute inset-y-0 end-2 my-auto text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Display Type */}
                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                <Palette size={10} /> Display
                            </label>
                            <div className="flex bg-gray-100 dark:bg-zinc-700 p-0.5 rounded-lg border border-gray-200 dark:border-zinc-600">
                                {(['select', 'radio', 'pills'] as AttributeDisplayType[]).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => onUpdateAttributeConfig(attr.name, { ...attr.config, displayType: type })}
                                        className={`flex-1 flex items-center justify-center py-1 rounded-md transition-all duration-200 ${
                                            attr.config.displayType === type 
                                            ? 'bg-white dark:bg-zinc-600 text-cyan-600 dark:text-cyan-400 shadow-sm' 
                                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                                        }`}
                                        title={type}
                                    >
                                        {type === 'select' && <List size={14} />}
                                        {type === 'radio' && <MousePointerClick size={14} />}
                                        {type === 'pills' && <Type size={14} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Values Area */}
                    <div className="flex-1 p-4 bg-gray-50/30 dark:bg-zinc-900/30 overflow-y-auto max-h-48 min-h-[120px]">
                         <div className="flex flex-wrap gap-2">
                            {attr.values.map(val => (
                                <div key={val} className="relative group/val">
                                    {editingValue?.attr === attr.name && editingValue?.val === val ? (
                                        <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-cyan-500 rounded px-1.5 py-0.5 shadow-sm z-10 absolute -top-1 -start-1 min-w-[100px]">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={tempName}
                                                onChange={(e) => setTempName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveValue()}
                                                onBlur={saveValue}
                                                className="w-full text-xs outline-none bg-transparent text-gray-900 dark:text-white"
                                            />
                                            <Check size={12} className="text-green-600 dark:text-green-400 cursor-pointer" onClick={saveValue} />
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleValueClick(attr.name, val)}
                                            className={`relative ps-3 pe-3 py-1 text-xs rounded-md border transition-all duration-200 flex items-center max-w-[140px] ${
                                                attr.config.displayType === 'pills' 
                                                ? 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-600 text-gray-700 dark:text-gray-200 hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-sm' 
                                                : 'bg-transparent border-dashed border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-zinc-800 hover:border-cyan-300 dark:hover:border-cyan-700'
                                            }`}
                                        >
                                            <span className="truncate">{val}</span>
                                            
                                            {/* Edit Icon Overlay */}
                                            <div 
                                                onClick={(e) => startEditValue(attr.name, val, e)}
                                                className="absolute inset-y-0 end-0 w-6 flex items-center justify-center bg-gray-50 dark:bg-zinc-700 border-s border-gray-200 dark:border-zinc-600 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-e-md opacity-0 group-hover/val:opacity-100 transition-opacity cursor-pointer"
                                            >
                                                <Edit2 size={10} />
                                            </div>
                                        </button>
                                    )}
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            ))}
        </div>
        
        {sortedAttributes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-80 text-gray-400 dark:text-gray-500 animate-in fade-in">
                <div className="bg-gray-100 dark:bg-zinc-800 p-6 rounded-full mb-4">
                    <Tags size={48} className="text-gray-300 dark:text-zinc-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">No Attributes Found</h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try searching for a different attribute or value.</p>
            </div>
        )}
      </div>
    </div>
  );
};