# دليل تحويل تطبيق إدارة المنتجات إلى موديول قابل للدمج

## Module Integration Guide - Product Automator

---

## المقدمة

هذا الدليل موجه للمطورين الذين يعملون على تطبيق "إدارة المنتجات" (Product Automator) ويوضح المتطلبات والهيكلية اللازمة لتحويل التطبيق إلى موديول قابل للدمج داخل تطبيق **ALA Odoo Client**.

---

## 1. الهيكلية المطلوبة للموديول

### 1.1 بنية المجلدات

يجب أن يتبع الموديول الهيكلية التالية:

```
modules/
└── product-automator/           # اسم المجلد الرئيسي للموديول
    ├── index.ts                 # نقطة الدخول الرئيسية (Barrel Export)
    ├── types.ts                 # تعريفات TypeScript للأنواع
    │
    ├── components/              # مكونات React الخاصة بالموديول
    │   ├── index.ts             # تصدير جميع المكونات
    │   ├── ProductAutomatorCard.tsx
    │   ├── AutomationRulesPanel.tsx
    │   └── ...
    │
    ├── pages/                   # صفحات الموديول
    │   ├── index.ts             # تصدير جميع الصفحات
    │   ├── ProductAutomatorDashboard.tsx
    │   └── ...
    │
    ├── services/                # خدمات API
    │   ├── index.ts             # تصدير جميع الخدمات
    │   └── productAutomatorService.ts
    │
    ├── hooks/                   # React Hooks مخصصة (اختياري)
    │   ├── index.ts
    │   └── useProductAutomator.ts
    │
    └── utils/                   # دوال مساعدة (اختياري)
        ├── index.ts
        └── automationHelpers.ts
```

### 1.2 ملف نقطة الدخول الرئيسية (`index.ts`)

```typescript
// modules/product-automator/index.ts

// تصدير المكونات
export { default as ProductAutomatorCard } from './components/ProductAutomatorCard';
export { default as AutomationRulesPanel } from './components/AutomationRulesPanel';

// تصدير الصفحات
export { default as ProductAutomatorDashboard } from './pages/ProductAutomatorDashboard';

// تصدير الخدمات
export * from './services/productAutomatorService';

// تصدير الأنواع
export type * from './types';

// تصدير Hooks (إن وجدت)
export * from './hooks';

// تصدير معلومات الموديول
export const MODULE_INFO = {
    id: 'product-automator',
    name: 'Product Automator',
    nameAr: 'أتمتة المنتجات',
    version: '1.0.0',
    description: 'Automate product data management',
    descriptionAr: 'أتمتة إدارة بيانات المنتجات',
    icon: 'cog',
    route: '/product-automator',
    requiredPermissions: ['product.product:write'],
};
```

---

## 2. متطلبات المكونات

### 2.1 قواعد عامة للمكونات

1. **استخدام TypeScript**: جميع المكونات يجب أن تكون بصيغة `.tsx`
2. **التصدير الافتراضي**: استخدم `export default` للمكون الرئيسي
3. **الخصائص المُعرَّفة**: جميع الـ Props يجب أن تكون معرفة بوضوح

### 2.2 نمط المكون المطلوب

```typescript
// components/ProductAutomatorCard.tsx

import React from 'react';

// تعريف الخصائص
interface ProductAutomatorCardProps {
    productId: number;
    onComplete?: (result: AutomationResult) => void;
    onError?: (error: Error) => void;
    className?: string;
}

const ProductAutomatorCard: React.FC<ProductAutomatorCardProps> = ({
    productId,
    onComplete,
    onError,
    className = '',
}) => {
    // منطق المكون
    
    return (
        <div className={`product-automator-card ${className}`}>
            {/* محتوى المكون */}
        </div>
    );
};

export default ProductAutomatorCard;
```

### 2.3 دعم الثيم (Theme Support)

استخدم CSS Variables المتاحة في التطبيق الرئيسي:

```css
/* استخدم المتغيرات المتاحة */
.product-automator-card {
    background: var(--bg-card, #ffffff);
    color: var(--text-primary, #1a1a1a);
    border-radius: var(--radius-lg, 12px);
    box-shadow: var(--shadow-sm);
}

/* دعم الوضع الداكن */
.dark .product-automator-card {
    background: var(--bg-card-dark, #2d2d2d);
    color: var(--text-primary-dark, #ffffff);
}
```

### 2.4 دعم RTL (اللغة العربية)

```css
/* دعم الاتجاه من اليمين لليسار */
[dir="rtl"] .product-automator-card {
    text-align: right;
}

[dir="rtl"] .automator-icon {
    margin-left: 8px;
    margin-right: 0;
}
```

---

## 3. متطلبات الصفحات

### 3.1 هيكل الصفحة الرئيسية

```typescript
// pages/ProductAutomatorDashboard.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ProductAutomatorDashboardProps {
    onBack: () => void;          // دالة للرجوع للصفحة السابقة
    onError?: (error: any) => void;  // معالجة الأخطاء
    appMode?: 'sales' | 'purchasing';  // وضع التطبيق الحالي
}

const ProductAutomatorDashboard: React.FC<ProductAutomatorDashboardProps> = ({
    onBack,
    onError,
    appMode = 'sales',
}) => {
    const navigate = useNavigate();

    return (
        <div className="product-automator-dashboard">
            {/* Header with back button */}
            <header className="dashboard-header">
                <button onClick={onBack} className="back-btn">
                    ← العودة
                </button>
                <h1>أتمتة المنتجات</h1>
            </header>

            {/* Main content */}
            <main className="dashboard-content">
                {/* محتوى الصفحة */}
            </main>
        </div>
    );
};

export default ProductAutomatorDashboard;
```

### 3.2 الخصائص المطلوبة للصفحات

| الخاصية | النوع | مطلوب | الوصف |
|---------|------|-------|-------|
| `onBack` | `() => void` | ✅ | دالة للرجوع للصفحة السابقة |
| `onError` | `(error: any) => void` | ❌ | معالجة الأخطاء العامة |
| `appMode` | `'sales' \| 'purchasing'` | ❌ | وضع التطبيق الحالي |

---

## 4. متطلبات الخدمات (Services)

### 4.1 هيكل الخدمة

```typescript
// services/productAutomatorService.ts

import { apiClient } from '@/core/adapters/apiClient';

// أنواع البيانات
export interface AutomationRule {
    id: number;
    name: string;
    conditions: RuleCondition[];
    actions: RuleAction[];
    is_active: boolean;
}

// دالة جلب القواعد
export const getAutomationRules = async (): Promise<AutomationRule[]> => {
    const response = await apiClient.get('/api/product.automation.rule');
    return response.data;
};

// دالة تنفيذ الأتمتة
export const runAutomation = async (
    ruleId: number,
    productIds: number[]
): Promise<AutomationResult> => {
    const response = await apiClient.post('/api/product.automation.rule/run', {
        rule_id: ruleId,
        product_ids: productIds,
    });
    return response.data;
};
```

### 4.2 استخدام React Query

```typescript
// hooks/useAutomationRules.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAutomationRules, runAutomation } from '../services/productAutomatorService';

export const useAutomationRules = () => {
    return useQuery({
        queryKey: ['automation-rules'],
        queryFn: getAutomationRules,
        staleTime: 5 * 60 * 1000, // 5 دقائق
    });
};

export const useRunAutomation = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ ruleId, productIds }: { ruleId: number; productIds: number[] }) =>
            runAutomation(ruleId, productIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
};
```

---

## 5. متطلبات تعريف الأنواع (Types)

### 5.1 ملف الأنواع الرئيسي

```typescript
// types.ts

// أنواع قواعد الأتمتة
export interface AutomationRule {
    id: number;
    name: string;
    description?: string;
    conditions: RuleCondition[];
    actions: RuleAction[];
    is_active: boolean;
    priority: number;
    created_at: string;
    updated_at: string;
}

export interface RuleCondition {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: string | number;
}

export interface RuleAction {
    type: 'update_field' | 'add_tag' | 'send_notification';
    field?: string;
    value?: string | number;
    template?: string;
}

export interface AutomationResult {
    success: boolean;
    affected_count: number;
    errors?: string[];
    details?: AutomationDetail[];
}

export interface AutomationDetail {
    product_id: number;
    product_name: string;
    status: 'success' | 'error' | 'skipped';
    message?: string;
}
```

---

## 6. التكامل مع التطبيق الرئيسي

### 6.1 إضافة Route جديد

بعد إعداد الموديول، سيتم إضافته للـ Routes كالتالي:

```typescript
// routes/AppRoutes.tsx

// Import الموديول
import { ProductAutomatorDashboard } from '../modules/product-automator';

// داخل Routes
<Route 
    path="/sales/product-automator" 
    element={
        <ProductAutomatorDashboard 
            onBack={() => navigate('/sales')} 
            onError={setGeneralApiError}
            appMode="sales"
        />
    } 
/>

<Route 
    path="/purchasing/product-automator" 
    element={
        <ProductAutomatorDashboard 
            onBack={() => navigate('/purchasing')} 
            onError={setGeneralApiError}
            appMode="purchasing"
        />
    } 
/>
```

### 6.2 إضافة بطاقة في لوحة التحكم

```typescript
// في SalesHome.tsx أو PurchasingHome.tsx

import { MODULE_INFO } from '../modules/product-automator';

// إضافة بطاقة جديدة
<DashboardActionCard
    icon={faCog}
    label={MODULE_INFO.nameAr}
    onClick={() => navigate('/sales/product-automator')}
/>
```

---

## 7. الموارد المشتركة المتاحة

### 7.1 المكونات المشتركة (`@/shared/ui`)

| المكون | الوصف | مثال الاستخدام |
|--------|-------|----------------|
| `BackButton` | زر الرجوع | `<BackButton onClick={onBack} />` |
| `LoadingSpinner` | مؤشر التحميل | `<LoadingSpinner size="lg" />` |
| `Modal` | نافذة منبثقة | `<Modal isOpen={open} onClose={close}>` |
| `Toast` | رسالة إشعار | `toast.success('تم بنجاح')` |

### 7.2 الـ Stores المتاحة

```typescript
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';

// استخدام
const { user, company } = useAuthStore();
const { theme, language } = useSettingsStore();
```

### 7.3 API Client

```typescript
import { apiClient } from '@/core/adapters/apiClient';

// GET request
const data = await apiClient.get('/api/endpoint');

// POST request
const result = await apiClient.post('/api/endpoint', payload);
```

---

## 8. متطلبات التوثيق

### 8.1 JSDoc للدوال

```typescript
/**
 * جلب قواعد الأتمتة من الخادم
 * @returns Promise<AutomationRule[]> قائمة القواعد
 * @throws Error إذا فشل الاتصال
 */
export const getAutomationRules = async (): Promise<AutomationRule[]> => {
    // ...
};
```

### 8.2 README للموديول

أنشئ ملف `README.md` داخل مجلد الموديول:

```markdown
# Product Automator Module

## الوصف
موديول أتمتة المنتجات يسمح بإنشاء قواعد لتحديث المنتجات تلقائياً.

## المتطلبات
- Odoo v17+
- ala_product_automator addon مثبت

## الاستخدام
\`\`\`typescript
import { ProductAutomatorDashboard } from '@/modules/product-automator';
\`\`\`
```

---

## 9. قائمة التحقق (Checklist)

قبل تسليم الموديول، تأكد من:

- [ ] الهيكلية تطابق المتطلبات المذكورة
- [ ] جميع الملفات بصيغة TypeScript (`.ts` / `.tsx`)
- [ ] ملف `index.ts` يصدّر جميع المكونات والخدمات والأنواع
- [ ] جميع المكونات تدعم الـ Props المطلوبة
- [ ] CSS يدعم Dark Mode و RTL
- [ ] لا توجد imports مباشرة من مجلدات أخرى (استخدم `@/shared` و `@/core`)
- [ ] جميع الدوال موثقة بـ JSDoc
- [ ] ملف README.md موجود
- [ ] لا توجد أخطاء TypeScript
- [ ] تم اختبار المكونات

---

## 10. أمثلة عملية

### 10.1 مثال كامل لمكون

```typescript
// components/AutomationStatusBadge.tsx

import React from 'react';

interface AutomationStatusBadgeProps {
    status: 'active' | 'inactive' | 'error';
    size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
    active: { label: 'نشط', color: 'bg-green-500' },
    inactive: { label: 'متوقف', color: 'bg-gray-500' },
    error: { label: 'خطأ', color: 'bg-red-500' },
};

const AutomationStatusBadge: React.FC<AutomationStatusBadgeProps> = ({
    status,
    size = 'md',
}) => {
    const config = statusConfig[status];
    
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-2 text-base',
    };

    return (
        <span className={`
            ${config.color} 
            ${sizeClasses[size]} 
            text-white 
            rounded-full 
            font-medium
        `}>
            {config.label}
        </span>
    );
};

export default AutomationStatusBadge;
```

---

## 11. التواصل والدعم

إذا واجهتم أي استفسارات أثناء التطوير، يرجى التواصل مع فريق التطوير الرئيسي.

---

*آخر تحديث: يناير 2026*
*الإصدار: 1.0*
