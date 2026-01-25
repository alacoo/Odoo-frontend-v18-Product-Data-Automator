
import React, { useState } from 'react';
import { OdooPricelist } from '../types';
import { Search, Banknote, Globe, Package } from 'lucide-react';

interface Props {
    pricelists: OdooPricelist[];
}

export const PricelistManager: React.FC<Props> = ({ pricelists }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredList = pricelists.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.currencyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-zinc-900/50 font-sans">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Banknote className="text-primary-600 dark:text-primary-400" size={24} /> 
                        Pricelists
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage and view your Odoo sales pricelists and currency configurations.
                    </p>
                </div>

                <div className="relative w-full sm:w-72 group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search pricelists..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-700/50 border border-gray-200 dark:border-zinc-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all dark:text-white"
                    />
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {filteredList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-80 text-gray-400 animate-in fade-in">
                        <div className="bg-gray-100 dark:bg-zinc-800 p-6 rounded-full mb-4">
                            <Banknote size={48} strokeWidth={1} className="text-gray-300 dark:text-zinc-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">No pricelists found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md text-center">
                            Ensure you are connected to Odoo and have configured pricelists in the backend.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-zinc-700/50 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-zinc-700">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Currency</th>
                                    <th className="px-6 py-4 w-32 text-right">ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                                {filteredList.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-900 dark:text-white">{row.name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-100 dark:border-blue-800">
                                                <Globe size={12} /> {row.currencyName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700 px-2 py-1 rounded">
                                                {row.id}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
