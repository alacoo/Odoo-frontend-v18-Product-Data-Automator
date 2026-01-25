/**
 * Example Component
 * 
 * This is a template component showing the expected structure.
 */

import React from 'react';

// Import types from module types file
interface ExampleComponentProps {
    title: string;
    description?: string;
    onAction?: () => void;
    className?: string;
}

const ExampleComponent: React.FC<ExampleComponentProps> = ({
    title,
    description,
    onAction,
    className = '',
}) => {
    return (
        <div className={`example-component ${className}`}>
            <div className="example-component__header">
                <h3 className="example-component__title">{title}</h3>
                {description && (
                    <p className="example-component__description">{description}</p>
                )}
            </div>

            {onAction && (
                <button
                    onClick={onAction}
                    className="example-component__button"
                >
                    تنفيذ
                </button>
            )}
        </div>
    );
};

export default ExampleComponent;
