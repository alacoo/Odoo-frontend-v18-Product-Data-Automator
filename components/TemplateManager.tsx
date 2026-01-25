import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { ParsedProduct, ActiveTab } from '../types';
import { 
    Layers, Edit2, CheckSquare, Square, Search, Barcode, Package, Trash2, Merge, Download, 
    Tag, Settings2, DollarSign, Ruler, ExternalLink, X, ChevronDown, Check
} from 'lucide-react';

interface Props {
  products: ParsedProduct[];
  onUpdateTemplate: (oldName: string, field: keyof ParsedProduct, value: any) => void;
  onNavigate: (tab: ActiveTab, query: string) => void;
  onDeleteTemplates: (names: string[]) => void;
  onMergeTemplates: (targetName: string, sourceNames: string[]) => void;
  externalSearchTerm?: string;
}

export const TemplateManager: React.FC<Props> = ({ products, onUpdateTemplate, onNavigate, onDeleteTemplates, onMergeTemplates, externalSearchTerm }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string, uom: string, type: string, tracking: string }>({ name: '', uom: '', type: '', tracking: 'none' });
  
  // State for Variants Dialog
  const [viewingVariantsFor, setViewingVariantsFor] = useState<string | null>(null);

  useEffect(() => {
    if (externalSearchTerm !== undefined) {
      setSearchTerm(externalSearchTerm);
    }
  }, [externalSearchTerm]);

  const templates = useMemo(() => {
    const map = new Map<string, {
      name: string,
      uom: string,
      type: string,
      tracking: string,
      variants: ParsedProduct[],
      minPrice: number,
      maxPrice: number,
      commonCode: string,
      usedAttributes: Set<string>
    }>();

    products.forEach(p => {
      if (!map.has(p.templateName)) {
        map.set(p.templateName, {
          name: p.templateName,
          uom: p.uom,
          type: p.detailedType,
          tracking: p.tracking || 'none',
          variants: [],
          minPrice: p.price || 0,
          maxPrice: p.price || 0,
          commonCode: '',
          usedAttributes: new Set()
        });
      }
      const tmpl = map.get(p.templateName)!;
      tmpl.variants.push(p);
      
      const price = p.price || 0;
      if (price < tmpl.minPrice) tmpl.minPrice = price;
      if (price > tmpl.maxPrice) tmpl.maxPrice = price;

      p.attributes.forEach(attr => tmpl.usedAttributes.add(attr.name));
    });

    map.forEach(tmpl => {
        if (tmpl.variants.length > 0) {
            const firstCode = tmpl.variants[0].defaultCode;
            const parts = firstCode.split('-');
            tmpl.commonCode = parts.length > 1 ? parts[0] : firstCode.substring(0, 4); 
        }
    });

    return Array.from(map.values())
        .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm]);

  // Derived state for the modal
  const activeTemplateVariants = useMemo(() => {
      if (!viewingVariantsFor) return [];
      return templates.find(t => t.name === viewingVariantsFor)?.variants || [];
  }, [viewingVariantsFor, templates]);

  // --- Actions ---

  const toggleSelect = (name: string) => {
    const newSet = new Set(selectedTemplates);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelectedTemplates(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedTemplates.size === templates.length) setSelectedTemplates(new Set());
    else setSelectedTemplates(new Set(templates.map(t => t.name)));
  };

  const startEdit = (tmpl: any) => {
    setEditingId(tmpl.name);
    setEditForm({ name: tmpl.name, uom: tmpl.uom, type: tmpl.type, tracking: tmpl.tracking });
  };

  const saveEdit = (oldName: string) => {
    if (editForm.name.trim() !== oldName) {
      onUpdateTemplate(oldName, 'templateName', editForm.name.trim());
    }
    if (editForm.uom !== templates.find(t => t.name === oldName)?.uom) {
        onUpdateTemplate(oldName, 'uom', editForm.uom);
    }
    if (editForm.type !== templates.find(t => t.name === oldName)?.type) {
        onUpdateTemplate(oldName, 'detailedType', editForm.type);
    }
    if (editForm.tracking !== templates.find(t => t.name === oldName)?.tracking) {
        onUpdateTemplate(oldName, 'tracking', editForm.tracking);
    }
    setEditingId(null);
  };

  const handleDeleteSelected = () => {
    if (confirm(`Delete ${selectedTemplates.size} templates and ALL their variants?`)) {
        onDeleteTemplates(Array.from(selectedTemplates));
        setSelectedTemplates(new Set());
    }
  };

  const handleMergeSelected = () => {
      const selected = Array.from(selectedTemplates);
      if (selected.length < 2) return;
      
      const target = selected[0];
      const sources = selected.slice(1);

      if (confirm(`Merge ${sources.length} templates into "${target}"?`)) {
          onMergeTemplates(target, sources);
          setSelectedTemplates(new Set());
      }
  };

  const handleExportTemplates = () => {
      const dataToExport = templates.map(t => ({
          Name: t.name,
          InternalReference: t.commonCode,
          Type: t.type,
          UOM: t.uom,
          Tracking: t.tracking,
          VariantCount: t.variants.length,
          PriceRange: `${t.minPrice} - ${t.maxPrice}`
      }));
      const csv = Papa.unparse(dataToExport);
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `odoo_templates_list.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const formatPrice = (val: number) => new Intl.NumberFormat('en-US').format(val);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-800 relative">
      
      {/* Variants Modal Dialog */}
      {viewingVariantsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-zinc-700">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-xl text-primary-600 dark:text-primary-400">
                            <Layers size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{viewingVariantsFor}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Ref:</span>
                                <span className="font-mono text-xs bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                    {activeTemplateVariants[0]?.defaultCode.split('-')[0] || 'N/A'}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-100 dark:border-primary-800">
                                    {activeTemplateVariants.length} Variants
                                </span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setViewingVariantsFor(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Content - Table */}
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-700">
                            <tr>
                                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product Variant</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Internal Ref</th>
                                <th className="p-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Barcode</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                            {activeTemplateVariants.map((variant) => (
                                <tr key={variant.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">{variant.templateName}</div>
                                        <div className="flex flex-wrap gap-1">
                                            {variant.attributes.map((attr, idx) => (
                                                <span key={idx} className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400 border border-gray-200 dark:border-zinc-700">
                                                    {attr.name}: {attr.value}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-mono text-xs bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                            {variant.defaultCode || '-'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                                            {formatPrice(variant.price || 0)} <span className="text-xs text-gray-400 font-normal">{variant.currency}</span>
                                        </div>
                                        {variant.standard_price && variant.standard_price > 0 && (
                                            <div className="text-xs text-gray-400 mt-0.5">Cost: {formatPrice(variant.standard_price)}</div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                            <Barcode size={16} />
                                            <span className="font-mono text-xs">{variant.barcode || '-'}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-2 bg-gray-50 dark:bg-zinc-900">
                    <button 
                        onClick={() => { setViewingVariantsFor(null); onNavigate(ActiveTab.VARIANTS, viewingVariantsFor || ''); }}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-lg text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                        Manage in Products <ExternalLink size={16} />
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-700 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <button 
                onClick={toggleSelectAll}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500 dark:text-gray-400 transition-colors"
                title="Select All"
            >
                {selectedTemplates.size > 0 && selectedTemplates.size === templates.length 
                    ? <CheckSquare size={20} className="text-primary-600" /> 
                    : <Square size={20} />
                }
            </button>
            
            <div className="relative w-full max-w-sm group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={18} className="text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-zinc-600 rounded-xl bg-gray-50 dark:bg-zinc-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                />
            </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {selectedTemplates.size > 0 ? (
                <div className="flex items-center gap-2 animate-in slide-in-from-top-2 fade-in">
                    <span className="bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 text-xs font-bold px-2 py-1 rounded-md border border-primary-100 dark:border-primary-800">
                        {selectedTemplates.size} selected
                    </span>
                    
                    {selectedTemplates.size > 1 && (
                        <button 
                            onClick={handleMergeSelected}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-sm font-medium transition-colors border border-blue-200 dark:border-blue-800"
                        >
                            <Merge size={16} /> Merge
                        </button>
                    )}
                    
                    <button 
                        onClick={handleDeleteSelected}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                </div>
            ) : (
                <button 
                    onClick={handleExportTemplates}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-sm font-medium"
                >
                    <Download size={16} /> Export List
                </button>
            )}
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-zinc-900/50">
        {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                 <Layers size={64} className="mb-4 opacity-20" />
                 <p className="text-lg font-medium">No templates found</p>
                 <p className="text-sm">Try adjusting your search</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {templates.map((tmpl) => (
                    <div 
                        key={tmpl.name}
                        className={`
                            bg-white dark:bg-zinc-800 rounded-xl border transition-all duration-200 flex flex-col relative group
                            ${selectedTemplates.has(tmpl.name) 
                                ? 'border-primary-500 ring-1 ring-primary-500 shadow-md z-10' 
                                : 'border-gray-200 dark:border-zinc-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md'
                            }
                        `}
                    >
                        {editingId === tmpl.name ? (
                            <div className="p-4 flex flex-col gap-3 h-full animate-in fade-in zoom-in-95 duration-200">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name</label>
                                    <input 
                                        value={editForm.name} 
                                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                        autoFocus
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Type</label>
                                        <div className="relative">
                                            <select 
                                                value={editForm.type} 
                                                onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                                                className="w-full appearance-none px-2 py-1.5 text-xs border border-gray-300 rounded bg-white focus:outline-none"
                                            >
                                                <option value="product">Storable</option>
                                                <option value="service">Service</option>
                                                <option value="consu">Consumable</option>
                                            </select>
                                            <ChevronDown size={12} className="absolute right-2 top-2 pointer-events-none text-gray-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tracking</label>
                                        <div className="relative">
                                            <select 
                                                value={editForm.tracking} 
                                                onChange={(e) => setEditForm({...editForm, tracking: e.target.value})}
                                                className="w-full appearance-none px-2 py-1.5 text-xs border border-gray-300 rounded bg-white focus:outline-none"
                                            >
                                                <option value="none">None</option>
                                                <option value="lot">By Lots</option>
                                                <option value="serial">By Serial</option>
                                            </select>
                                            <ChevronDown size={12} className="absolute right-2 top-2 pointer-events-none text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">UOM</label>
                                    <input 
                                        value={editForm.uom} 
                                        onChange={(e) => setEditForm({...editForm, uom: e.target.value})}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none"
                                    />
                                </div>
                                
                                <div className="mt-auto flex justify-end gap-2 pt-2">
                                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                    <button onClick={() => saveEdit(tmpl.name)} className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 rounded shadow-sm flex items-center gap-1">
                                        <Check size={12} /> Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 flex-1">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div 
                                            onClick={() => toggleSelect(tmpl.name)}
                                            className="mt-1 cursor-pointer text-gray-400 hover:text-primary-600 transition-colors"
                                        >
                                            {selectedTemplates.has(tmpl.name) 
                                                ? <CheckSquare size={20} className="text-primary-600" /> 
                                                : <Square size={20} />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-mono text-[10px] bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-600">
                                                    {tmpl.commonCode || 'NO-REF'}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tmpl.type === 'service' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                                    {tmpl.type === 'service' ? 'Service' : 'Storable'}
                                                </span>
                                            </div>
                                            <h3 
                                                className="text-sm font-bold text-gray-900 dark:text-white leading-tight line-clamp-2" 
                                                title={tmpl.name}
                                            >
                                                {tmpl.name}
                                            </h3>
                                        </div>
                                        <button 
                                            onClick={() => startEdit(tmpl)}
                                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-zinc-700 my-3" />

                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-0.5"><DollarSign size={12} /> Price Range</div>
                                            <div className="font-mono font-bold text-gray-800 dark:text-gray-200">
                                                {tmpl.minPrice === tmpl.maxPrice 
                                                    ? formatPrice(tmpl.minPrice) 
                                                    : `${formatPrice(tmpl.minPrice)} - ${formatPrice(tmpl.maxPrice)}`}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1 mb-0.5"><Ruler size={12} /> UOM</div>
                                            <div className="font-bold text-gray-800 dark:text-gray-200">{tmpl.uom}</div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Attributes ({tmpl.usedAttributes.size})</span>
                                            <button 
                                                onClick={() => onNavigate(ActiveTab.ATTRIBUTES, Array.from(tmpl.usedAttributes)[0] || '')}
                                                className="text-[10px] text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                            >
                                                <Settings2 size={10} /> Configure
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {Array.from(tmpl.usedAttributes).slice(0, 3).map(attr => (
                                                <span key={attr} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-gray-50 dark:bg-zinc-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-600">
                                                    <Tag size={8} /> {attr}
                                                </span>
                                            ))}
                                            {tmpl.usedAttributes.size > 3 && (
                                                <span className="text-[10px] text-gray-400 flex items-center px-1">+{tmpl.usedAttributes.size - 3}</span>
                                            )}
                                            {tmpl.usedAttributes.size === 0 && <span className="text-[10px] text-gray-400 italic">No attributes</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-zinc-700/30 px-4 py-2 border-t border-gray-100 dark:border-zinc-700 flex items-center justify-between rounded-b-xl">
                                    <div className="flex items-center gap-2">
                                        {tmpl.tracking !== 'none' && (
                                            <div 
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200"
                                                title={`Tracking: ${tmpl.tracking}`}
                                            >
                                                <Barcode size={10} /> {tmpl.tracking}
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => setViewingVariantsFor(tmpl.name)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors"
                                    >
                                        <Package size={14} /> {tmpl.variants.length} Variants
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};