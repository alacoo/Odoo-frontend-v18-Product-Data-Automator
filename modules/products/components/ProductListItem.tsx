import React, { useRef, useState, useEffect } from 'react';
import { ParsedProduct } from '../types';
import { ProductThumbnail } from './ProductThumbnail';
import { Trash2, Star } from 'lucide-react';

// --- Price Cell Component ---
const PriceCell = ({
    value,
    currency,
    isPrimary = false,
    onChange,
    disabled = false
}: {
    value: number | undefined,
    currency: string,
    label?: string,
    isPrimary?: boolean,
    onChange: (val: number) => void,
    disabled?: boolean
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const displayValue = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value || 0);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="number"
                value={value || 0}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                onBlur={() => setIsEditing(false)}
                onKeyDown={handleKeyDown}
                className="w-20 h-6 text-sm text-right bg-white dark:bg-zinc-800 border border-primary-500 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
        );
    }

    return (
        <div
            onClick={() => !disabled && setIsEditing(true)}
            className={`
                flex items-center justify-end gap-1 px-1 py-0.5 rounded cursor-pointer transition-colors
                ${disabled ? 'cursor-default' : 'hover:bg-gray-100 dark:hover:bg-zinc-700'}
            `}
        >
             <span className={`font-mono text-sm ${isPrimary ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {displayValue}
             </span>
            <span className="text-[10px] text-gray-400">
                {currency || 'YER'}
            </span>
        </div>
    );
};

// --- Product List Item ---

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

interface Props {
    product: ParsedProduct;
    selected: boolean;
    visibleColumns: VisibleColumns;
    canWrite: boolean;
    onSelect: () => void;
    onDelete: (id: string) => void;
    onUpdate: (id: string, field: keyof ParsedProduct, value: any) => void;
    onView: (product: ParsedProduct) => void;
    onImageClick: (id: string) => void;
}

export const ProductListItem: React.FC<Props> = ({
    product, selected, visibleColumns, canWrite,
    onSelect, onDelete, onUpdate, onView, onImageClick
}) => {

    const formatNum = (val: number) => new Intl.NumberFormat('en-US').format(val);

    const getSqmPrice = (p: ParsedProduct): number => {
        if (p.variant_price_per_sqm && p.variant_price_per_sqm > 0) return p.variant_price_per_sqm;
        const widthAttr = p.attributes.find(a => a.name.includes('عرض') || a.name.includes('Width'));
        if (widthAttr) {
            const match = widthAttr.value.match(/([\d\.]+)/);
            const width = match ? parseFloat(match[1]) : 0;
            if (width > 0 && p.price) return p.price / width;
        }
        return 0;
    };

    return (
        <tr className={`
            group border-b border-gray-100 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors
            ${selected ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}
        `}>
            <td className="w-4 p-4">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onSelect}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-zinc-700 dark:border-zinc-600"
                />
            </td>

            {visibleColumns.favorite && (
                <td className="w-8 p-2 text-center">
                    <button
                        onClick={() => onUpdate(product.id, 'is_favorite', !product.is_favorite)}
                        disabled={!canWrite}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    >
                        <Star size={16} className={product.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-zinc-600"} />
                    </button>
                </td>
            )}

            {visibleColumns.image && (
                <td className="w-12 p-2 text-center">
                    <ProductThumbnail product={product} onClick={() => onImageClick(product.id)} canWrite={canWrite} size={36} />
                </td>
            )}

            {visibleColumns.ref && (
                <td className="p-3">
                {canWrite ? (
                    <input
                        value={product.defaultCode || ''}
                        onChange={(e) => onUpdate(product.id, 'defaultCode', e.target.value)}
                        placeholder="REF..."
                        className={`w-full bg-transparent text-sm font-mono focus:outline-none focus:border-b focus:border-primary-500 ${!product.defaultCode ? 'text-red-500 placeholder-red-300' : 'text-gray-900 dark:text-gray-100'}`}
                    />
                ) : <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{product.defaultCode || '-'}</span>}
                </td>
            )}

            <td className="p-3">
                    {canWrite ? (
                    <input
                        value={product.templateName}
                        onChange={(e) => onUpdate(product.id, 'templateName', e.target.value)}
                        className="w-full bg-transparent text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:border-b focus:border-primary-500"
                    />
                    ) : (
                    <span
                        onClick={() => onView(product)}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary-600 hover:underline"
                    >
                        {product.templateName}
                    </span>
                    )}
            </td>

            {visibleColumns.variantValues && (
                <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                        {product.attributes.map((attr, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-600">
                                {attr.name}: {attr.value}
                            </span>
                        ))}
                    </div>
                </td>
            )}

            {visibleColumns.price && (
                <td className="p-3 text-right">
                    <PriceCell value={product.price} currency={product.currency || 'YER'} isPrimary onChange={(val) => onUpdate(product.id, 'price', val)} disabled={!canWrite} />
                </td>
            )}

            {visibleColumns.cost && (
                <td className="p-3 text-right">
                    <PriceCell value={product.standard_price} currency={product.currency || 'YER'} onChange={(val) => onUpdate(product.id, 'standard_price', val)} disabled={!canWrite} />
                </td>
            )}

            {visibleColumns.category && (
                <td className="p-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{product.categ_name || 'All'}</span>
                </td>
            )}

            {visibleColumns.onHand && (
                <td className="p-3 text-right">
                    <span className={`text-sm font-bold ${product.qty_available && product.qty_available > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                        {product.qty_available ? formatNum(product.qty_available) : '0.00'}
                    </span>
                </td>
            )}

            {visibleColumns.forecasted && (
                <td className="p-3 text-right">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {product.virtual_available ? formatNum(product.virtual_available) : '0.00'}
                    </span>
                </td>
            )}

            {visibleColumns.unit && <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{product.uom}</td>}

            {visibleColumns.type && (
                <td className="p-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                        {product.detailedType}
                    </span>
                </td>
            )}

            {visibleColumns.barcode && (
                <td className="p-3 text-xs font-mono text-gray-500 dark:text-gray-400">{product.barcode || ''}</td>
            )}

            {visibleColumns.sqm && (
                <td className="p-3 text-right text-sm text-blue-600 dark:text-blue-400">
                    {getSqmPrice(product) > 0 ? formatNum(getSqmPrice(product)) : '-'}
                </td>
            )}

            <td className="p-3 text-center">
                <button
                    onClick={() => onDelete(product.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                    <Trash2 size={14} />
                </button>
            </td>
        </tr>
    );
};