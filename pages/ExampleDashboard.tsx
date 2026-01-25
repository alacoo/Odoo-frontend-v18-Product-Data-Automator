/**
 * Example Dashboard Page
 * 
 * This is a template page showing the expected structure for module pages.
 * 
 * REQUIRED PROPS:
 * - onBack: Function to navigate back to the previous page
 * 
 * OPTIONAL PROPS:
 * - onError: Function to handle errors
 * - appMode: Current application mode ('sales' | 'purchasing')
 */

import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';

// Types
interface ExampleDashboardProps {
    onBack: () => void;
    onError?: (error: any) => void;
    appMode?: 'sales' | 'purchasing';
}

const ExampleDashboard: React.FC<ExampleDashboardProps> = ({
    onBack,
    onError,
    appMode = 'sales',
}) => {
    // State
    const [isLoading, setIsLoading] = useState(false);

    // Handlers
    const handleAction = async () => {
        try {
            setIsLoading(true);
            // Perform action
        } catch (error) {
            onError?.(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="example-dashboard">
            {/* Header Section */}
            <header className="dashboard-header">
                <button
                    onClick={onBack}
                    className="back-button"
                    type="button"
                >
                    <span className="back-icon">←</span>
                    <span>العودة</span>
                </button>

                <h1 className="dashboard-title">
                    عنوان الصفحة
                </h1>
            </header>

            {/* Main Content */}
            <main className="dashboard-content">
                <div className="dashboard-card">
                    <h2>مرحباً بك في الموديول</h2>
                    <p>
                        هذه صفحة قالب توضح الهيكلية المطلوبة.
                        الوضع الحالي: {appMode === 'sales' ? 'مبيعات' : 'مشتريات'}
                    </p>

                    <button
                        onClick={handleAction}
                        disabled={isLoading}
                        className="action-button"
                    >
                        {isLoading ? 'جاري التنفيذ...' : 'تنفيذ إجراء'}
                    </button>
                </div>
            </main>
        </div>
    );
};

export default ExampleDashboard;
