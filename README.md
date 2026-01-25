# Module Template

## الوصف

هذا قالب للموديولات الجديدة يوضح الهيكلية والمتطلبات اللازمة للتكامل مع تطبيق ALA Odoo Client.

## هيكل المجلدات

```
_module-template/
├── index.ts              # نقطة الدخول الرئيسية
├── types.ts              # تعريفات TypeScript
├── README.md             # وثائق الموديول
│
├── components/           # مكونات React
│   └── ExampleComponent.tsx
│
├── pages/                # صفحات الموديول
│   └── ExampleDashboard.tsx
│
└── services/             # خدمات API
    └── exampleService.ts
```

## كيفية الاستخدام

### 1. نسخ القالب

```bash
cp -r modules/_module-template modules/your-module-name
```

### 2. تحديث الملفات

1. **index.ts**: تحديث اسم الموديول والتصديرات
2. **types.ts**: تعريف الأنواع الخاصة بالموديول
3. **components/**: إنشاء المكونات المطلوبة
4. **pages/**: إنشاء الصفحات المطلوبة
5. **services/**: إنشاء خدمات API

### 3. تسجيل الموديول

أضف الموديول في `routes/AppRoutes.tsx`:

```typescript
import { YourModuleDashboard } from '../modules/your-module-name';

// داخل Routes
<Route 
    path="/sales/your-module" 
    element={
        <YourModuleDashboard 
            onBack={() => navigate('/sales')} 
            onError={setGeneralApiError}
        />
    } 
/>
```

## المتطلبات

- الخصائص المطلوبة للصفحات:
  - `onBack: () => void`
  
- دعم RTL واللغة العربية
- دعم الوضع الداكن (Dark Mode)
- استخدام TypeScript

## ملاحظات مهمة

- استخدم `@/shared/ui` للمكونات المشتركة
- استخدم `@/core/adapters/apiClient` للاتصال بـ API
- لا تستورد مباشرة من مجلدات موديولات أخرى
