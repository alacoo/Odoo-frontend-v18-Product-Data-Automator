/**
 * Module Entry Point (Barrel Export)
 * 
 * This is the main entry point for the module.
 * Export all public components, services, types, and hooks from here.
 */

// Components
export { default as ExampleComponent } from './components/ExampleComponent';

// Pages
export { default as ExampleDashboard } from './pages/ExampleDashboard';

// Services
export * from './services/exampleService';

// Types
export type * from './types';

// Hooks (if any)
// export * from './hooks';

// Module Info - Required for module registration
export const MODULE_INFO = {
    id: 'module-template',
    name: 'Module Template',
    nameAr: 'قالب موديول',
    version: '1.0.0',
    description: 'Template module for creating new modules',
    descriptionAr: 'قالب لإنشاء موديولات جديدة',
    icon: 'puzzle-piece', // FontAwesome icon name
    route: '/module-template',
    requiredPermissions: [],
};
