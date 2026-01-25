import React, { useState } from 'react';
import { ParsedProduct, AiSuggestion } from '../types';
import { analyzeProductsWithGemini } from '../services/geminiService';
import { Sparkles, ArrowRight, Check, X, Wand2, Loader2, AlertCircle } from 'lucide-react';

interface Props {
    open: boolean;
    onClose: () => void;
    selectedProducts: ParsedProduct[];
    onApplyChanges: (suggestions: AiSuggestion[]) => void;
}

export const AiOrganizer: React.FC<Props> = ({ open, onClose, selectedProducts, onApplyChanges }) => {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
    const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
    const [step, setStep] = useState<'intro' | 'analyzing' | 'review'>('intro');
    const [error, setError] = useState<string | null>(null);

    if (!open) return null;

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        setStep('analyzing');
        
        try {
            const input = selectedProducts.map(p => ({ 
                id: p.id, 
                name: p.templateName, // Use current template name as source for refinement
                code: p.defaultCode 
            }));
            
            const results = await analyzeProductsWithGemini(input);
            setSuggestions(results);
            setSelectedSuggestionIds(new Set(results.map(r => r.id)));
            setStep('review');
        } catch (e: any) {
            setError(e.message || "Failed to analyze products.");
            setStep('intro');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        const toApply = suggestions.filter(s => selectedSuggestionIds.has(s.id));
        onApplyChanges(toApply);
        onClose();
        // Reset
        setTimeout(() => {
            setStep('intro');
            setSuggestions([]);
        }, 500);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedSuggestionIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedSuggestionIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedSuggestionIds.size === suggestions.length) {
            setSelectedSuggestionIds(new Set());
        } else {
            setSelectedSuggestionIds(new Set(suggestions.map(s => s.id)));
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-zinc-700 relative">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-primary-600 dark:text-primary-400">
                            <Sparkles size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Smart Organizer</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {step === 'intro' && (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                            <div className="p-6 bg-primary-50 dark:bg-primary-900/10 rounded-full mb-6 text-primary-600 dark:text-primary-400 ring-4 ring-primary-50/50 dark:ring-primary-900/20">
                                <Wand2 size={48} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Optimize {selectedProducts.length} Products
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-lg mb-8 leading-relaxed">
                                Gemini AI will analyze your product names to automatically extract attributes (Color, Size, Material) and group variants under clean Template names for Odoo v18.
                            </p>
                            
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg mb-6 text-sm">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}

                            <button 
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-600/30 transition-all hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                {loading ? 'Analyzing...' : 'Start Analysis'}
                            </button>
                        </div>
                    )}

                    {step === 'analyzing' && (
                         <div className="flex flex-col items-center justify-center p-12 h-full">
                             <div className="relative">
                                 <div className="absolute inset-0 bg-primary-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                                 <Loader2 size={64} className="text-primary-600 dark:text-primary-400 animate-spin relative z-10" />
                             </div>
                             <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-6">Analyzing Product Structures...</h3>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This may take a few seconds.</p>
                         </div>
                    )}

                    {step === 'review' && (
                        <div className="flex flex-col h-full">
                            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800 flex items-center gap-3">
                                <div className="p-1 bg-primary-100 dark:bg-primary-800 rounded-full text-primary-600 dark:text-primary-300">
                                    <Check size={14} strokeWidth={3} />
                                </div>
                                <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
                                    Found {suggestions.length} optimizations. Review and uncheck any you wish to discard.
                                </span>
                            </div>
                            
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0 z-10">
                                        <tr>
                                            <th className="w-10 p-4 border-b border-gray-200 dark:border-zinc-700">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedSuggestionIds.size === suggestions.length}
                                                    onChange={toggleSelectAll}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                            </th>
                                            <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-zinc-700">Original Name</th>
                                            <th className="w-8 border-b border-gray-200 dark:border-zinc-700"></th>
                                            <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-zinc-700">New Template Name</th>
                                            <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-zinc-700">Extracted Attributes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                                        {suggestions.map((suggestion) => {
                                            const original = selectedProducts.find(p => p.id === suggestion.id);
                                            const isSelected = selectedSuggestionIds.has(suggestion.id);
                                            return (
                                                <tr key={suggestion.id} className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors ${isSelected ? 'bg-primary-50/10' : ''}`}>
                                                    <td className="p-4">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected}
                                                            onChange={() => toggleSelection(suggestion.id)}
                                                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                        />
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-500 line-through opacity-70 truncate max-w-[200px]" title={original?.templateName}>
                                                        {original?.templateName}
                                                    </td>
                                                    <td className="text-center text-gray-400">
                                                        <ArrowRight size={16} />
                                                    </td>
                                                    <td className="p-4 text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]" title={suggestion.suggestedTemplate}>
                                                        {suggestion.suggestedTemplate}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {suggestion.attributes.map((attr, i) => (
                                                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-100 dark:border-green-800">
                                                                    {attr.name}: {attr.value}
                                                                </span>
                                                            ))}
                                                            {suggestion.attributes.length === 0 && (
                                                                <span className="text-xs text-gray-400 italic">No attributes</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3 bg-gray-50 dark:bg-zinc-800/50">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    {step === 'review' && (
                        <button 
                            onClick={handleApply}
                            className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-lg shadow-primary-600/20 transition-all"
                        >
                            <Check size={18} />
                            Apply {selectedSuggestionIds.size} Changes
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};