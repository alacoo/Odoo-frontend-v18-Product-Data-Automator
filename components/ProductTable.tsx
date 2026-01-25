import React, { useState, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { ParsedProduct, ActiveTab, SyncCapabilities } from '../types';
import { ProductListItem } from '../modules/products/components/ProductListItem';
import { ProductThumbnail } from '../modules/products/components/ProductThumbnail';
import {
    Search, Trash2, Package,
    Plus, Download,
    Check, X, Filter, Upload,
    Maximize2, Tag, ChevronDown
} from 'lucide-react';

interface Props {
  products: ParsedProduct[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, field: keyof ParsedProduct, value: any) => void;
  onNavigate: (tab: ActiveTab, query: string) => void;
  onAdd: () => void;
  renderActions?: (selectedIds: Set<string>, clearSelection: () => void) => React.ReactNode;
  capabilities?: SyncCapabilities;
}

interface VisibleColumns {
  favorite: boolean;
  image: boolean;
  ref: boolean;
  variantValues: boolean;
  price: boolean;
  cost: boolean;
  category: boolean;
  type: boolean;
  onHand: boolean;
  forecasted: boolean;
  unit: boolean;
  barcode: boolean;
  sqm: boolean;
  roll: boolean;
}

export const ProductTable: React.FC<Props> = ({ products, onDelete, onUpdate, onNavigate, onAdd, renderActions, capabilities }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof ParsedProduct, direction: 'asc' | 'desc' } | null>(null);
  const [massEditPrice, setMassEditPrice] = useState<string>('');

  // Product Details Dialog State
  const [viewProduct, setViewProduct] = useState<ParsedProduct | null>(null);

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingForId, setUploadingForId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const canWrite = capabilities ? capabilities.canWrite : true;
  const canCreate = capabilities ? capabilities.canCreate : true;
  const canDelete = capabilities ? (capabilities.canDelete || capabilities.canWrite) : true;

  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    favorite: true,
    image: true,
    ref: true,
    variantValues: true,
    price: true,
    cost: true,
    category: true,
    type: false,
    onHand: true,
    forecasted: true,
    unit: true,
    barcode: false,
    sqm: false,
    roll: false,
  });

  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p =>
      p.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.defaultCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [products, searchTerm, sortConfig]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleColumn = (key: keyof VisibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) {
      selectedIds.forEach(id => onDelete(id));
      setSelectedIds(new Set());
    }
  };

  const handleMassUpdatePrice = () => {
      const price = parseFloat(massEditPrice);
      if (isNaN(price)) return;
      if (confirm(`Update price to ${price} for ${selectedIds.size} items?`)) {
          selectedIds.forEach(id => onUpdate(id, 'price', price));
          setMassEditPrice('');
          setSelectedIds(new Set());
      }
  };

  const handleExport = () => {
      const dataToExport = filteredProducts.map(p => ({
          InternalReference: p.defaultCode,
          Name: p.templateName,
          Category: p.categ_name,
          Attributes: p.attributes.map(a => `${a.name}:${a.value}`).join(', '),
          SalesPrice: p.price,
          Cost: p.standard_price,
          OnHand: p.qty_available,
          Forecasted: p.virtual_available,
          UOM: p.uom,
          Type: p.detailedType
      }));

      const csv = Papa.unparse(dataToExport);
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleSort = (key: keyof ParsedProduct) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearSearch = () => {
      setSearchTerm('');
      searchInputRef.current?.focus();
  };

  const handleImageClick = (id: string) => {
      if (!canWrite) return;
      setUploadingForId(id);
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && uploadingForId) {
          const reader = new FileReader();
          reader.onload = (evt) => {
              const base64 = evt.target?.result as string;
              onUpdate(uploadingForId, 'image', base64);
              setUploadingForId(null);
          };
          reader.readAsDataURL(file);
      }
      e.target.value = ''; // Reset
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-800">

      {/* Product Details Modal */}
      {viewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-zinc-700">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-xl text-primary-600 dark:text-primary-400">
                           <Package size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{viewProduct.templateName}</h2>
                            <div className="flex gap-2 mt-1.5">
                                <span className="px-2 py-0.5 rounded-md border border-gray-200 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 text-xs font-mono text-gray-600 dark:text-gray-400">
                                    {viewProduct.defaultCode || 'No Ref'}
                                </span>
                                <span className="px-2 py-0.5 rounded-md border border-gray-200 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 text-xs text-gray-600 dark:text-gray-400">
                                    {viewProduct.categ_name || 'All'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setViewProduct(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left: Image */}
                        <div className="md:col-span-1">
                            <div className="w-full aspect-square bg-gray-100 dark:bg-zinc-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700">
                                <ProductThumbnail product={viewProduct} size="100%" />
                            </div>
                        </div>

                        {/* Right: Info */}
                        <div className="md:col-span-2 space-y-6">
                            {/* Stats Card */}
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-primary-50/20 dark:bg-primary-900/10">
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">On Hand</span>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        {viewProduct.qty_available || 0} <span className="text-sm font-normal text-gray-500">{viewProduct.uom}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Forecasted</span>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        {viewProduct.virtual_available || 0} <span className="text-sm font-normal text-gray-500">{viewProduct.uom}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Attributes */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                                    <Tag size={16} /> Attributes & Values
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {viewProduct.attributes.length > 0 ? viewProduct.attributes.map((attr, i) => (
                                        <span key={i} className="inline-flex items-center px-3 py-1 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm">
                                            <span className="opacity-60 mr-1">{attr.name}:</span> {attr.value}
                                        </span>
                                    )) : <span className="text-sm text-gray-400 italic">No attributes defined.</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 flex justify-between">
                     <button
                        onClick={() => onNavigate(ActiveTab.TEMPLATES, viewProduct.templateName)}
                        className="flex items-center gap-2 px-4 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors font-medium"
                     >
                        <Maximize2 size={18} /> View Template
                     </button>
                     <button
                        onClick={() => setViewProduct(null)}
                        className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                     >
                        Close
                     </button>
                </div>
            </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />

      {/* Toolbar */}
      <div className="p-3 border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between gap-4 bg-white dark:bg-zinc-800 z-10 sticky top-0">
         <div className="flex items-center gap-3 flex-1">
             {/* Search Input */}
             <div className="relative w-full max-w-md group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products..."
                    className="block w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-zinc-600 rounded-xl bg-gray-50 dark:bg-zinc-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                />
                {searchTerm && (
                    <button onClick={clearSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                        <X size={14} />
                    </button>
                )}
             </div>

             {/* Columns Dropdown */}
             <div className="relative">
               <button
                 onClick={() => setShowColumnMenu(!showColumnMenu)}
                 className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors text-sm font-medium"
               >
                 <Filter size={14} /> Columns
               </button>
               {showColumnMenu && (
                   <>
                       <div className="fixed inset-0 z-10" onClick={() => setShowColumnMenu(false)} />
                       <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-700 z-20 py-2 animate-in fade-in zoom-in-95 duration-100">
                           {Object.keys(visibleColumns).map((key) => (
                               <label key={key} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors">
                                   <input
                                      type="checkbox"
                                      checked={visibleColumns[key as keyof VisibleColumns]}
                                      onChange={() => toggleColumn(key as keyof VisibleColumns)}
                                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                   />
                                   <span className="text-sm text-gray-700 dark:text-gray-200 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                               </label>
                           ))}
                       </div>
                   </>
               )}
             </div>
         </div>

         <div className="flex items-center gap-2">
             {selectedIds.size > 0 ? (
                 <div className="flex items-center gap-3 bg-primary-600 text-white px-3 py-1.5 rounded-xl shadow-lg shadow-primary-600/20 animate-in slide-in-from-top-2">
                     <span className="text-xs font-bold whitespace-nowrap">{selectedIds.size} Selected</span>
                     {canWrite && (
                        <div className="flex items-center gap-1 pl-3 border-l border-white/20">
                            <input
                                placeholder="Price..."
                                value={massEditPrice}
                                onChange={(e) => setMassEditPrice(e.target.value)}
                                className="w-20 bg-white/20 border-none rounded px-2 py-0.5 text-xs text-white placeholder-white/60 focus:outline-none focus:ring-1 focus:ring-white/50"
                            />
                            <button onClick={handleMassUpdatePrice} className="p-1 hover:bg-white/20 rounded">
                                <Check size={14} />
                            </button>
                        </div>
                     )}
                     {renderActions && renderActions(selectedIds, () => setSelectedIds(new Set()))}
                     {canDelete && (
                        <button onClick={handleBulkDelete} className="p-1.5 hover:bg-white/20 rounded text-white ml-1">
                            <Trash2 size={16} />
                        </button>
                     )}
                 </div>
             ) : (
                 <div className="flex items-center gap-2">
                     <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-colors text-sm font-medium"
                     >
                        <Download size={16} /> Export
                     </button>
                     {canCreate && (
                        <button
                            onClick={onAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-600/20 transition-all text-sm font-bold"
                        >
                            <Plus size={18} /> New Product
                        </button>
                     )}
                 </div>
             )}
         </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-zinc-900/50">
         <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0 z-10 shadow-sm">
                <tr>
                    <th className="w-4 p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                            type="checkbox"
                            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-zinc-700 dark:border-zinc-600"
                            checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                            onChange={toggleSelectAll}
                        />
                    </th>
                    {visibleColumns.favorite && <th className="w-8"></th>}
                    {visibleColumns.image && <th className="w-12"></th>}

                    {visibleColumns.ref && (
                        <th
                            className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary-600"
                            onClick={() => handleSort('defaultCode')}
                        >
                            Internal Ref
                        </th>
                    )}

                    <th
                        className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary-600"
                        onClick={() => handleSort('templateName')}
                    >
                        Name
                    </th>

                    {visibleColumns.variantValues && <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attributes</th>}
                    {visibleColumns.price && <th className="p-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>}
                    {visibleColumns.cost && <th className="p-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>}
                    {visibleColumns.category && <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>}

                    {visibleColumns.onHand && <th className="p-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">On Hand</th>}
                    {visibleColumns.forecasted && <th className="p-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Forecasted</th>}

                    {visibleColumns.unit && <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit</th>}
                    {visibleColumns.type && <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>}

                    {visibleColumns.barcode && <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Barcode</th>}
                    {visibleColumns.sqm && <th className="p-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price/m²</th>}

                    <th className="w-8"></th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-100 dark:divide-zinc-700">
                {filteredProducts.map(product => (
                    <ProductListItem
                        key={product.id}
                        product={product}
                        selected={selectedIds.has(product.id)}
                        visibleColumns={visibleColumns}
                        canWrite={canWrite}
                        onSelect={() => toggleSelectOne(product.id)}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                        onView={setViewProduct}
                        onImageClick={handleImageClick}
                    />
                ))}
            </tbody>
         </table>
         {filteredProducts.length === 0 && (
             <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                 <Package size={48} className="mb-4 opacity-50" />
                 <p className="text-lg font-medium">No products found</p>
                 <p className="text-sm">Try adjusting your search or filters</p>
             </div>
         )}
      </div>
    </div>
  );
};