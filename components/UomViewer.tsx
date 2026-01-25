import React, { useState, useMemo } from 'react';
import { Search, Scale, Ruler, Clock, Box as BoxIcon, LayoutGrid, Copy, Check, Info } from 'lucide-react';
import { UOM_DATA } from '../data/uomData';

export const UomViewer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredData = useMemo(() => {
      return UOM_DATA.map(cat => ({
        ...cat,
        units: cat.units.filter(u => 
          u.toLowerCase().includes(searchTerm.toLowerCase()) || 
          cat.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(cat => cat.units.length > 0 || cat.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm]);

  const totalUnits = useMemo(() => filteredData.reduce((acc, cat) => acc + cat.units.length, 0), [filteredData]);

  const getCategoryStyles = (id: string) => {
    if (id.includes('kgm')) return { icon: Scale, colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-900/20', borderClass: 'hover:border-amber-300 dark:hover:border-amber-700', badgeBg: 'bg-amber-100 dark:bg-amber-900/30', badgeText: 'text-amber-800 dark:text-amber-200', accent: 'bg-amber-500' };
    if (id.includes('length')) return { icon: Ruler, colorClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-50 dark:bg-blue-900/20', borderClass: 'hover:border-blue-300 dark:hover:border-blue-700', badgeBg: 'bg-blue-100 dark:bg-blue-900/30', badgeText: 'text-blue-800 dark:text-blue-200', accent: 'bg-blue-500' };
    if (id.includes('wtime')) return { icon: Clock, colorClass: 'text-red-600 dark:text-red-400', bgClass: 'bg-red-50 dark:bg-red-900/20', borderClass: 'hover:border-red-300 dark:hover:border-red-700', badgeBg: 'bg-red-100 dark:bg-red-900/30', badgeText: 'text-red-800 dark:text-red-200', accent: 'bg-red-500' };
    if (id.includes('surface')) return { icon: LayoutGrid, colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-900/20', borderClass: 'hover:border-emerald-300 dark:hover:border-emerald-700', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30', badgeText: 'text-emerald-800 dark:text-emerald-200', accent: 'bg-emerald-500' };
    if (id.includes('vol')) return { icon: BoxIcon, colorClass: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-50 dark:bg-purple-900/20', borderClass: 'hover:border-purple-300 dark:hover:border-purple-700', badgeBg: 'bg-purple-100 dark:bg-purple-900/30', badgeText: 'text-purple-800 dark:text-purple-200', accent: 'bg-purple-500' };
    return { icon: BoxIcon, colorClass: 'text-cyan-600 dark:text-cyan-400', bgClass: 'bg-cyan-50 dark:bg-cyan-900/20', borderClass: 'hover:border-cyan-300 dark:hover:border-cyan-700', badgeBg: 'bg-cyan-100 dark:bg-cyan-900/30', badgeText: 'text-cyan-800 dark:text-cyan-200', accent: 'bg-cyan-500' };
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-zinc-900/50 p-6 overflow-hidden font-sans">
       {/* Header Section */}
       <div className="bg-white dark:bg-zinc-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-700 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
           <div>
               <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                   <Ruler className="text-cyan-600 dark:text-cyan-400" size={24} />
                   <span>Units of Measure</span>
               </h1>
               <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                   Reference guide for Odoo v18 measurement categories and XML IDs.
               </p>
           </div>

           <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="hidden md:block text-start border-e border-gray-200 dark:border-zinc-700 pe-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Categories</span>
                    <div className="text-lg font-bold text-gray-800 dark:text-gray-200 leading-none">{filteredData.length}</div>
                </div>
                <div className="hidden md:block text-start border-e border-gray-200 dark:border-zinc-700 pe-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Total Units</span>
                    <div className="text-lg font-bold text-gray-800 dark:text-gray-200 leading-none">{totalUnits}</div>
                </div>

                <div className="relative w-full md:w-72 group">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-400 dark:text-gray-500 group-focus-within:text-cyan-600 transition-colors" />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search units..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full ps-10 pe-3 py-2.5 border border-gray-200 dark:border-zinc-600 rounded-xl leading-5 bg-gray-50 dark:bg-zinc-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-700 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-200 sm:text-sm text-start"
                    />
                </div>
           </div>
       </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredData.map(cat => {
            const { icon: Icon, colorClass, bgClass, borderClass, badgeBg, badgeText, accent } = getCategoryStyles(cat.id);
            const isCopied = copiedId === cat.id;
            
            return (
                <div 
                    key={cat.id}
                    className={`group relative flex flex-col bg-white dark:bg-zinc-800 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${borderClass}`}
                >
                    {/* Decorative Top Line */}
                    <div className={`absolute top-0 left-5 right-5 h-1 rounded-b-md opacity-80 ${accent}`} />

                    <div className="p-5 flex-1 flex flex-col gap-4">
                        
                        {/* Card Header */}
                        <div className="flex justify-between items-start mt-2">
                            <div className="flex gap-3 items-center">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgClass} ${colorClass}`}>
                                    <Icon size={24} strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cat.name}</h3>
                                    <div 
                                        onClick={() => handleCopy(cat.id)}
                                        className="flex items-center gap-1.5 cursor-pointer group/id"
                                    >
                                        <Info size={12} className="text-gray-400 dark:text-gray-500 group-hover/id:text-gray-600 dark:group-hover/id:text-gray-300" />
                                        <code className="text-xs font-mono text-gray-500 dark:text-gray-400 group-hover/id:text-gray-800 dark:group-hover/id:text-gray-200 transition-colors bg-gray-50 dark:bg-zinc-700 px-1.5 py-0.5 rounded border border-gray-100 dark:border-zinc-600">
                                            {cat.id}
                                        </code>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleCopy(cat.id)}
                                title={isCopied ? "Copied ID!" : "Copy Category ID"}
                                className={`p-2 rounded-lg border transition-all duration-200 ${
                                    isCopied 
                                    ? `bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400` 
                                    : `bg-gray-50 dark:bg-zinc-700 border-gray-100 dark:border-zinc-600 text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-zinc-600 hover:border-gray-300 dark:hover:border-zinc-500 hover:text-gray-700 dark:hover:text-gray-300 hover:shadow-sm`
                                }`}
                            >
                                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>

                        <div className="h-px bg-gray-100 dark:bg-zinc-700 w-full" />

                        {/* Units List */}
                        <div className="flex flex-wrap gap-2">
                            {cat.units.map((unit, idx) => {
                                const unitCopied = copiedId === unit;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleCopy(unit)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 flex items-center gap-1.5 ${
                                            unitCopied 
                                            ? `${bgClass} ${colorClass} border-transparent ring-1 ring-offset-1 ring-current`
                                            : `${badgeBg} ${badgeText} border-transparent hover:brightness-95 hover:shadow-sm`
                                        }`}
                                    >
                                        {unitCopied && <Check size={12} />}
                                        {unit}
                                    </button>
                                );
                            })}
                            {cat.units.length === 0 && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 italic">No matching units found.</span>
                            )}
                        </div>
                    </div>
                </div>
            );
            })}
        </div>
        
        {filteredData.length === 0 && (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400 dark:text-gray-500 animate-in fade-in duration-500">
                <div className="bg-gray-100 dark:bg-zinc-800 p-6 rounded-full mb-6">
                    <Search size={48} strokeWidth={1.5} className="text-gray-300 dark:text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">No categories found</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Try searching for a specific unit or category name.</p>
            </div>
        )}
      </div>
    </div>
  );
};