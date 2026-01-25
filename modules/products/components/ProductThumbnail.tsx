import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { ParsedProduct } from '../types';

interface Props {
    product: ParsedProduct;
    onClick?: () => void;
    canWrite?: boolean;
    size?: number | string;
}

export const ProductThumbnail: React.FC<Props> = ({ product, onClick, canWrite, size = 48 }) => {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);
    const [attemptedName, setAttemptedName] = useState(false);

    useEffect(() => {
        setHasError(false);
        setAttemptedName(false);

        if (product.image) {
            setImgSrc(product.image.startsWith('data:') ? product.image : `data:image/png;base64,${product.image}`);
        } else if (product.defaultCode) {
            const safeCode = product.defaultCode.trim();
            setImgSrc(`/product_images/${safeCode}.jpg`);
        } else if (product.templateName) {
             setImgSrc(`/product_images/${product.templateName.trim()}.jpg`);
             setAttemptedName(true);
        } else {
            setHasError(true);
        }
    }, [product.image, product.defaultCode, product.templateName]);

    const handleError = () => {
        if (!attemptedName && product.templateName && imgSrc && !imgSrc.includes(product.templateName)) {
            setImgSrc(`/product_images/${product.templateName.trim()}.jpg`);
            setAttemptedName(true);
        } else {
            setHasError(true);
        }
    };

    // Calculate style for dynamic size if it's a number, or use class if generic
    const sizeStyle = typeof size === 'number' ? { width: size, height: size } : { width: size, height: size };

    return (
        <div
            onClick={onClick}
            style={sizeStyle}
            className={`
                relative rounded-lg bg-gray-100 dark:bg-zinc-700
                flex items-center justify-center overflow-hidden border border-gray-200 dark:border-zinc-600
                ${onClick ? 'cursor-pointer group' : 'cursor-default'}
            `}
        >
            {!hasError && imgSrc ? (
                <img
                    src={imgSrc}
                    alt=""
                    onError={handleError}
                    className="w-full h-full object-cover"
                />
            ) : (
                <ImageIcon
                    size={typeof size === 'number' ? size / 2.5 : 24}
                    className="text-gray-400 opacity-50"
                />
            )}

            {canWrite && onClick && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white">
                    <Upload size={16} />
                </div>
            )}
        </div>
    );
};