import React from 'react';
import { ParsedProduct } from '../types';
import { ProductThumbnail } from './ProductThumbnail';
import { Star, Check } from 'lucide-react';

interface Props {
    product: ParsedProduct;
    selected: boolean;
    onSelect: () => void;
    onView: (product: ParsedProduct) => void;
}

export const ProductGridItem: React.FC<Props> = ({ 
    product, selected, onSelect, onView 
}) => {
    const formatPrice = (val: number) => new Intl.NumberFormat('en-US').format(val);

    return (
        <div 
            onClick={() => onView(product)}
            className={`
                group relative bg-white dark:bg-zinc-800 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden
                ${selected 
                    ? 'border-primary-500 ring-1 ring-primary-500 shadow-md' 
                    : 'border-gray-200 dark:border-zinc-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md'
                }
            `}
        >
            {/* Selection Circle */}
            <div 
                className={`
                    absolute top-2 left-2 z-10 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200
                    ${selected
                        ? 'bg-primary-600 border-primary-600 text-white opacity-100'
                        : 'bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 text-transparent opacity-0 group-hover:opacity-100 hover:border-primary-400'
                    }
                `}
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
            >
                <Check size={14} strokeWidth={3} />
            </div>

            {/* Favorite Star */}
            {product.is_favorite && (
                <div className="absolute top-2 right-2 z-10 text-yellow-400 drop-shadow-sm">
                    <Star size={18} fill="currentColor" />
                </div>
            )}

            {/* Image Area */}
            <div className="aspect-square w-full border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50">
                <ProductThumbnail product={product} size="100%" />
            </div>

            {/* Content Area */}
            <div className="p-3">
                <div className="flex justify-between items-start mb-1.5 gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex-1" title={product.templateName}>
                        {product.templateName}
                    </h3>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-600 truncate max-w-[80px]">
                        {product.defaultCode || 'No Ref'}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                        {product.categ_name}
                    </span>
                </div>

                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                                {formatPrice(product.price || 0)}
                            </span>
                            <span className="text-[10px] text-gray-400">{product.currency}</span>
                        </div>
                    </div>
                    
                    <div className="text-right">
                        <div className={`text-xs font-bold ${product.qty_available && product.qty_available > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                            {product.qty_available || 0} <span className="text-[10px] font-normal">{product.uom}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};