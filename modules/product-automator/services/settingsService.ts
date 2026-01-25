
import { OdooConfig } from "../types";

let currentSettings: OdooConfig = {
  url: 'https://odoo1.smartsoftapp.cloud',
  db: 'odoo1',
  username: 'borihy@gmail.com',
  password: 'admin',
  enablePricelists: true, // Default to enabled
};

export const getSettings = (): { baseUrl: string; db: string; login: string; password?: string; enablePricelists: boolean } => {
  return {
    baseUrl: currentSettings.url.replace(/\/+$/, ''), // Remove trailing slash
    db: currentSettings.db,
    login: currentSettings.username,
    password: currentSettings.password,
    enablePricelists: !!currentSettings.enablePricelists
  };
};

export const saveSettings = (settings: OdooConfig) => {
  currentSettings = settings;
};

// Helper to get the full config object for UI initialization
export const getFullSettings = (): OdooConfig => {
  return { ...currentSettings };
};
