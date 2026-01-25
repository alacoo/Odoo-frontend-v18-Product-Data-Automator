
// modules/product-automator/index.ts

// Export Pages
export { default as ProductAutomatorDashboard } from './pages/ProductAutomatorDashboard';

// Module Metadata
export const MODULE_INFO = {
    id: 'product-automator',
    name: 'Product Automator',
    nameAr: 'أتمتة المنتجات',
    version: '1.0.0',
    description: 'Automate product data management, migration, and organization for Odoo v18',
    descriptionAr: 'أتمتة إدارة بيانات المنتجات وترحيلها وتنظيمها لنظام أودو 18',
    icon: 'database',
    route: '/product-automator',
    requiredPermissions: ['product.product:write', 'product.template:write'],
};
