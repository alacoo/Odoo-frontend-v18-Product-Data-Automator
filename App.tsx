import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  createTheme, ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Typography, 
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, 
  IconButton, Button, Container, Alert, Tooltip, Stack, alpha 
} from '@mui/material';
import { 
  LayoutDashboard, Tags, Layers, Scale, Settings, Database, 
  Server, PlayCircle, RefreshCw, UploadCloud, FileJson, 
  ChevronLeft, ChevronRight, FileDown,
  Moon, Sun, Languages, ArrowRightLeft, Sparkles, Activity, Banknote, Coins, DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ParsedProduct, ProcessingStep, ActiveTab, AppMode, Notification, OdooCurrency, OdooPricelist, SyncCapabilities } from './types';
import { ProductTable } from './components/ProductTable';
import { AttributeManager } from './components/AttributeManager';
import { TemplateManager } from './components/TemplateManager';
import { ExportConfigurator } from './components/ExportConfigurator';
import { UomViewer } from './components/UomViewer';
import { ConnectionManager } from './components/ConnectionManager';
import { MigrationManager } from './components/MigrationManager';
import { PricelistManager } from './components/PricelistManager';
import { DashboardStats } from './components/DashboardStats';
import { getDemoData, DEFAULT_RATES } from './data/demoData';
import { 
    authenticateOdoo, 
    fetchOdooProducts,
    fetchOdooCurrencies, 
    fetchOdooPricelists,
    createOdooProduct, 
    updateOdooProduct, 
    deleteOdooProduct 
} from './services/odooService';
import { getFullSettings } from './services/settingsService';

const DRAWER_WIDTH = 260;

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('demo');
  const [currentStep, setCurrentStep] = useState<ProcessingStep>(ProcessingStep.REVIEW);
  const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.VARIANTS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Theme State
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [direction, setDirection] = useState<'rtl' | 'ltr'>('rtl');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [liveProducts, setLiveProducts] = useState<ParsedProduct[]>([]);
  const [attributeConfigs, setAttributeConfigs] = useState<Map<string, any>>(new Map());
  const [currencies, setCurrencies] = useState<OdooCurrency[]>([]);
  const [pricelists, setPricelists] = useState<OdooPricelist[]>([]);
  
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Permissions State
  const [capabilities, setCapabilities] = useState<SyncCapabilities>({
      canRead: true, canWrite: true, canCreate: true, canDelete: false
  });

  // --- Theme Configuration ---
  const theme = useMemo(() => createTheme({
    direction: direction,
    typography: {
      fontFamily: direction === 'rtl' ? 'Cairo, sans-serif' : 'Inter, sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 700 },
      button: { fontWeight: 600 },
    },
    palette: {
      mode: mode,
      primary: {
        main: '#017E84', // Odoo Teal
        light: '#019EA6',
        dark: '#015559',
      },
      secondary: {
        main: '#714B67', // Odoo Purple
        light: '#8D6382',
        dark: '#5a3c52',
      },
      background: {
        default: mode === 'light' ? '#F8F9FA' : '#0a0a0a',
        paper: mode === 'light' ? '#FFFFFF' : '#171717',
      },
      text: {
        primary: mode === 'light' ? '#212529' : '#e0e0e0',
        secondary: mode === 'light' ? '#666666' : '#a0a0a0',
      }
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, textTransform: 'none' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 12 },
          elevation1: { boxShadow: mode === 'light' ? '0 2px 10px rgba(0, 0, 0, 0.03)' : 'none' },
        }
      },
      MuiAppBar: {
        styleOverrides: {
            root: {
                backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(23, 23, 23, 0.8)',
                backdropFilter: 'blur(12px)',
                borderBottom: `1px solid ${mode === 'light' ? '#E0E0E0' : '#333'}`,
                boxShadow: 'none',
                color: mode === 'light' ? '#212529' : '#fff',
            }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          head: { 
            fontWeight: 600, 
            backgroundColor: mode === 'light' ? '#F9FAFB' : '#272727',
            color: mode === 'light' ? '#212529' : '#e0e0e0'
          },
        }
      }
    },
  }), [mode, direction]);

  // Update HTML dir attribute
  useEffect(() => {
    document.dir = direction;
    document.documentElement.lang = direction === 'rtl' ? 'ar' : 'en';
  }, [direction]);

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const toggleDirection = () => {
    setDirection((prevDir) => (prevDir === 'rtl' ? 'ltr' : 'rtl'));
  };

  const addNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, title, message }]);
  };

  const handleCloseNotification = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (appMode === 'demo') {
        setParsedProducts(getDemoData());
    }

    const initConnection = async () => {
        const settings = getFullSettings();
        if (settings.password && settings.url) {
            setIsAutoConnecting(true);
            try {
                await authenticateOdoo();
                // Auto-connect does standard fetch without capabilities check for now, 
                // assuming existing session is valid. 
                // In production, you might want to run the full pre-check here too.
                const [products, fetchedCurrencies, fetchedPricelists] = await Promise.all([
                  fetchOdooProducts(),
                  fetchOdooCurrencies(),
                  fetchOdooPricelists()
                ]);
                setLiveProducts(products);
                setCurrencies(fetchedCurrencies);
                setPricelists(fetchedPricelists);
                if (appMode === 'live') {
                    setParsedProducts(products);
                }
                addNotification('success', 'Connected', `Synced ${products.length} products & ${fetchedCurrencies.length} currencies.`);
            } catch (e: any) {
                console.warn("Auto-connect failed:", e);
                if (appMode === 'live') setActiveTab(ActiveTab.CONNECTION);
            } finally {
                setIsAutoConnecting(false);
            }
        }
    };
    initConnection();
  }, []);

  const handleSwitchMode = (mode: AppMode) => {
      if (mode === appMode) return;
      setAppMode(mode);
      if (mode === 'live') {
          setParsedProducts(liveProducts);
          if (liveProducts.length === 0) setActiveTab(ActiveTab.CONNECTION);
      } else {
          setParsedProducts(getDemoData());
          setActiveTab(ActiveTab.VARIANTS);
          addNotification('info', 'Sandbox Mode', 'Loaded demo data.');
      }
  };

  const handleRefresh = async () => {
      setIsAutoConnecting(true);
      try {
          await authenticateOdoo();
          const [products, fetchedCurrencies, fetchedPricelists] = await Promise.all([
            fetchOdooProducts(),
            fetchOdooCurrencies(),
            fetchOdooPricelists()
          ]);
          setLiveProducts(products);
          setCurrencies(fetchedCurrencies);
          setPricelists(fetchedPricelists);
          if (appMode === 'live') setParsedProducts(products);
          addNotification('success', 'Refreshed', 'Data updated from server.');
      } catch (e: any) {
          addNotification('error', 'Update Failed', e.message);
      } finally {
          setIsAutoConnecting(false);
      }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          const newProducts: ParsedProduct[] = data.map((row: any) => {
              let attributes: {name: string, value: string}[] = [];
              if (row.Attributes) {
                  attributes = row.Attributes.split(',').map((pair: string) => {
                      const [name, value] = pair.split(':');
                      if (name && value) {
                          return { name: name.trim(), value: value.trim() };
                      }
                      return null;
                  }).filter((a: any) => a !== null);
              }

              return {
                  id: crypto.randomUUID(),
                  rawInput: row.Name || row.Description || 'Imported Item',
                  templateName: row.Name || row.Template || 'New Template',
                  defaultCode: row['Internal Reference'] || row.Code || '',
                  uom: row.UOM || 'Units',
                  price: row.Price || row['Sales Price'] || 0,
                  currency: row.Currency || 'SAR',
                  detailedType: 'product',
                  tracking: 'none',
                  attributes: attributes
              };
          });

          setParsedProducts(prev => [...prev, ...newProducts]);
          addNotification('success', 'Import Successful', `Loaded ${newProducts.length} items from file.`);
      };
      reader.readAsBinaryString(file);
      e.target.value = ''; 
  };

  const handleExportRawData = () => {
      const dataToExport = parsedProducts.map(p => ({
          'Internal Reference': p.defaultCode,
          'Name': p.templateName,
          'Price': p.price,
          'Currency': p.currency,
          'UOM': p.uom,
          'Type': p.detailedType,
          'Price Per SQM': p.price_per_sqm,
          'Attributes': p.attributes.map(a => `${a.name}:${a.value}`).join(', ')
      }));

      const csv = Papa.unparse(dataToExport);
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `raw_data_backup_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- CRUD Handlers ---

  const handleCreateProduct = async () => {
      if (appMode === 'live' && !capabilities.canCreate) {
          addNotification('error', 'Permission Denied', 'You do not have create permissions on Odoo.');
          return;
      }

      const newProduct: ParsedProduct = {
          id: appMode === 'live' ? 'temp_' + Date.now() : crypto.randomUUID(),
          rawInput: 'New Product',
          templateName: 'New Product',
          defaultCode: 'NEW-' + Math.floor(Math.random() * 1000),
          uom: 'Units',
          attributes: [],
          price: 0,
          detailedType: 'product',
          tracking: 'none'
      };

      if (appMode === 'live') {
          try {
             const newId = await createOdooProduct(newProduct);
             newProduct.id = String(newId);
             addNotification('success', 'Created', 'Product created in Odoo.');
          } catch (e: any) {
             addNotification('error', 'Creation Failed', e.message);
             return; 
          }
      }

      setParsedProducts(prev => [newProduct, ...prev]);
      if (appMode === 'live') setLiveProducts(prev => [newProduct, ...prev]);
  };

  const handleUpdateProduct = async (id: string, field: keyof ParsedProduct, value: any) => {
    if (appMode === 'live' && !capabilities.canWrite) {
         addNotification('error', 'Permission Denied', 'You do not have write permissions on Odoo.');
         return;
    }

    setParsedProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    if (appMode === 'live') {
        const product = parsedProducts.find(p => p.id === id);
        if (product && !id.startsWith('temp_')) {
             try {
                 await updateOdooProduct(parseInt(id), { [field]: value });
             } catch (e: any) {
                 addNotification('error', 'Save Failed', `Could not update ${field}: ${e.message}`);
             }
        }
        setLiveProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (appMode === 'live') {
        if (!capabilities.canDelete && !capabilities.canWrite) { // Relaxed check
             addNotification('error', 'Permission Denied', 'You do not have permission to delete/unlink.');
             return;
        }

        if (!confirm("Are you sure? This will delete the product from Odoo permanently.")) return;
        try {
            await deleteOdooProduct(parseInt(id));
            addNotification('success', 'Deleted', 'Product removed from Odoo.');
        } catch (e: any) {
            addNotification('error', 'Delete Failed', e.message);
            return;
        }
    }
    setParsedProducts(prev => prev.filter(p => p.id !== id));
    if (appMode === 'live') setLiveProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleDeleteTemplates = (templateNames: string[]) => {
      setParsedProducts(prev => prev.filter(p => !templateNames.includes(p.templateName)));
      addNotification('success', 'Deleted', `Removed ${templateNames.length} templates and their variants.`);
  };

  const handleMergeTemplates = (targetName: string, sourceNames: string[]) => {
      setParsedProducts(prev => prev.map(p => {
          if (sourceNames.includes(p.templateName)) {
              return { ...p, templateName: targetName };
          }
          return p;
      }));
      addNotification('success', 'Merged', `Merged ${sourceNames.length} templates into ${targetName}.`);
  };

  const handleUpdateTemplate = (oldName: string, field: keyof ParsedProduct, value: any) => {
      setParsedProducts(prev => prev.map(p => {
          if (p.templateName === oldName) {
              return { ...p, [field]: value };
          }
          return p;
      }));
  };

  // Update stats to use MUI colors (e.g., 'success', 'info', 'secondary')
  const stats = useMemo(() => {
    const usd = currencies.find(c => c.name === 'USD');
    const sar = currencies.find(c => c.name === 'SAR');
    
    // Fallback to DEFAULT_RATES if not found in server response
    const usdRate = usd && usd.inverse_rate ? Math.round(usd.inverse_rate) : DEFAULT_RATES.USD;
    const sarRate = sar && sar.inverse_rate ? Math.round(sar.inverse_rate) : DEFAULT_RATES.SAR;

    return [
        { label: 'Products', value: parsedProducts.length, icon: Tags, color: 'primary' },
        { label: 'Templates', value: new Set(parsedProducts.map(p => p.templateName)).size, icon: Layers, color: 'info' },
        // New Exchange Rate Cards
        { label: 'USD Rate', value: `${usdRate} YER`, icon: DollarSign, color: 'success' },
        { label: 'SAR Rate', value: `${sarRate} YER`, icon: Coins, color: 'warning' },
    ];
  }, [parsedProducts, currencies]);

  // --- Rendering ---

  if (currentStep === ProcessingStep.EXPORT_CONFIG) {
      return (
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ExportConfigurator 
                products={parsedProducts} 
                attributeConfigs={attributeConfigs} 
                onBack={() => setCurrentStep(ProcessingStep.REVIEW)} 
            />
          </ThemeProvider>
      );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        
        {/* Navigation Drawer */}
        <Drawer
          sx={{
            width: isSidebarOpen ? DRAWER_WIDTH : 70,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: isSidebarOpen ? DRAWER_WIDTH : 70,
              boxSizing: 'border-box',
              transition: theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
          variant="permanent"
          anchor={direction === 'rtl' ? 'right' : 'left'}
        >
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider', height: 65 }}>
             <Box sx={{ 
                 bgcolor: 'primary.main', 
                 color: 'white', 
                 p: 0.8, 
                 borderRadius: 1.5, 
                 display: 'flex',
                 boxShadow: '0 4px 12px rgba(1, 126, 132, 0.3)'
             }}>
                 <Database size={22} strokeWidth={2.5} />
             </Box>
             {isSidebarOpen && <Typography variant="h6" fontWeight="800" letterSpacing={-0.5} sx={{ background: '-webkit-linear-gradient(45deg, #017E84, #019EA6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DataFlow</Typography>}
          </Box>

          <Box sx={{ p: 2 }}>
             <Box sx={{ bgcolor: 'action.hover', p: 0.5, borderRadius: 3, display: 'flex', flexDirection: isSidebarOpen ? 'row' : 'column', gap: 1 }}>
                <Button 
                    fullWidth 
                    size="small" 
                    variant={appMode === 'demo' ? 'contained' : 'text'} 
                    color={appMode === 'demo' ? 'inherit' : 'primary'}
                    sx={appMode === 'demo' ? { bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1, borderRadius: 2 } : { color: 'text.secondary', borderRadius: 2 }}
                    onClick={() => handleSwitchMode('demo')}
                >
                    <PlayCircle size={16} style={{ marginInlineEnd: isSidebarOpen ? 8 : 0 }} /> {isSidebarOpen && "Demo"}
                </Button>
                <Button 
                    fullWidth 
                    size="small"
                    variant={appMode === 'live' ? 'contained' : 'text'}
                    color={appMode === 'live' ? 'inherit' : 'primary'}
                    sx={appMode === 'live' ? { bgcolor: 'background.paper', color: 'error.main', boxShadow: 1, borderRadius: 2 } : { color: 'text.secondary', borderRadius: 2 }}
                    onClick={() => handleSwitchMode('live')}
                >
                    <Server size={16} style={{ marginInlineEnd: isSidebarOpen ? 8 : 0 }} /> {isSidebarOpen && "Live"}
                </Button>
             </Box>
          </Box>

          <List sx={{ flex: 1, px: 1.5 }}>
              {[
                  { id: ActiveTab.VARIANTS, label: 'Products', icon: LayoutDashboard },
                  { id: ActiveTab.TEMPLATES, label: 'Templates', icon: Layers },
                  { id: ActiveTab.ATTRIBUTES, label: 'Attributes', icon: Tags },
                  { id: ActiveTab.UOMS, label: 'Units', icon: Scale },
                  { id: ActiveTab.PRICELISTS, label: 'Pricelists', icon: Banknote },
                  { id: ActiveTab.MIGRATION, label: 'Migration', icon: ArrowRightLeft },
                  { id: ActiveTab.CONNECTION, label: 'Connection', icon: Settings },
              ].map((item) => (
                  <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton 
                          selected={activeTab === item.id}
                          onClick={() => setActiveTab(item.id as ActiveTab)}
                          sx={{ 
                              borderRadius: 2.5, 
                              py: 1.2,
                              justifyContent: isSidebarOpen ? 'initial' : 'center',
                              '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }, '& .lucide': { color: theme.palette.primary.main } },
                              '&:hover': { bgcolor: 'action.hover' }
                          }}
                      >
                          <ListItemIcon sx={{ minWidth: 0, mr: isSidebarOpen ? (direction === 'ltr' ? 2 : 0) : 'auto', ml: isSidebarOpen ? (direction === 'rtl' ? 2 : 0) : 'auto', justifyContent: 'center', color: activeTab === item.id ? 'primary.main' : 'text.secondary' }}>
                              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                          </ListItemIcon>
                          {isSidebarOpen && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: activeTab === item.id ? 700 : 500 }} />}
                      </ListItemButton>
                  </ListItem>
              ))}
          </List>

          <Divider sx={{ mx: 2, mb: 2 }} />
          <Box sx={{ p: 1, px: 2, pb: 2 }}>
             <IconButton onClick={() => setIsSidebarOpen(!isSidebarOpen)} sx={{ width: '100%', borderRadius: 2, bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}>
                 {isSidebarOpen ? (direction === 'rtl' ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>) : (direction === 'rtl' ? <ChevronLeft size={20}/> : <ChevronRight size={20}/>)}
             </IconButton>
          </Box>
        </Drawer>

        {/* Main Content */}
        <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
           <AppBar position="static">
               <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 }, py: 1 }}>
                   
                   {/* Left: Context Info */}
                   <Box display="flex" alignItems="center" gap={2}>
                        <Box>
                            <Typography variant="h6" fontWeight="800" color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                {activeTab === ActiveTab.VARIANTS && 'Product Management'}
                                {activeTab === ActiveTab.TEMPLATES && 'Template Structure'}
                                {activeTab === ActiveTab.ATTRIBUTES && 'Attribute Config'}
                                {activeTab === ActiveTab.UOMS && 'Units of Measure'}
                                {activeTab === ActiveTab.PRICELISTS && 'Pricelists Manager'}
                                {activeTab === ActiveTab.CONNECTION && 'Backend Connection'}
                                {activeTab === ActiveTab.MIGRATION && 'Migration Tool'}
                                
                                <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto', mx: 0.5 }} />

                                {appMode === 'demo' ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.5, borderRadius: 5, bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main' }}>
                                        <Sparkles size={14} fill="currentColor" />
                                        <Typography variant="caption" fontWeight="bold">Sandbox</Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.5, borderRadius: 5, bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' }}>
                                        <Activity size={14} className="animate-pulse" />
                                        <Typography variant="caption" fontWeight="bold">Live Data</Typography>
                                    </Box>
                                )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -0.2 }}>
                                {parsedProducts.length} records available • {currencies.length} currencies
                            </Typography>
                        </Box>
                   </Box>

                   {/* Right: Actions */}
                   <Stack direction="row" spacing={1} alignItems="center">
                       {/* Settings Group */}
                       <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderRadius: 2, p: 0.5, mr: 1 }}>
                            <Tooltip title={mode === 'light' ? "Dark Mode" : "Light Mode"}>
                                <IconButton onClick={toggleColorMode} size="small" color="inherit" sx={{ borderRadius: 1.5 }}>
                                    {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={direction === 'rtl' ? "LTR Layout" : "RTL Layout"}>
                                <IconButton onClick={toggleDirection} size="small" color="inherit" sx={{ borderRadius: 1.5 }}>
                                    <Languages size={18} />
                                </IconButton>
                            </Tooltip>
                       </Box>

                       <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".csv,.xlsx,.xls" style={{display:'none'}} />
                       
                       <Tooltip title="Import Excel/CSV">
                            <IconButton onClick={() => fileInputRef.current?.click()} size="small" sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
                                <UploadCloud size={18} />
                            </IconButton>
                       </Tooltip>

                       <Tooltip title="Export Raw Data">
                            <IconButton onClick={handleExportRawData} size="small" sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
                                <FileJson size={18} />
                            </IconButton>
                       </Tooltip>
                       
                       {appMode === 'live' && (
                           <Tooltip title="Refresh Data">
                               <IconButton onClick={handleRefresh} disabled={isAutoConnecting} color="primary" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) } }}>
                                   <RefreshCw size={18} className={isAutoConnecting ? 'animate-spin' : ''} />
                               </IconButton>
                           </Tooltip>
                       )}
                       
                       <Button 
                           variant="contained" 
                           color="primary" 
                           startIcon={<FileDown size={18} />}
                           disabled={parsedProducts.length === 0}
                           onClick={() => setCurrentStep(ProcessingStep.EXPORT_CONFIG)}
                           sx={{ borderRadius: 2.5, px: 3, boxShadow: '0 4px 14px rgba(1, 126, 132, 0.25)' }}
                       >
                           Generate Import Files
                       </Button>
                   </Stack>
               </Toolbar>
           </AppBar>

           <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', bgcolor: 'background.default' }}>
                <Container maxWidth="xl" sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: '0 !important' }}>
                    
                    {/* Notifications */}
                    <Box sx={{ position: 'fixed', bottom: 24, right: direction === 'ltr' ? 24 : 'auto', left: direction === 'rtl' ? 24 : 'auto', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {notifications.map(n => (
                            <Alert 
                                key={n.id} 
                                severity={n.type} 
                                onClose={() => handleCloseNotification(n.id)}
                                variant="filled"
                                sx={{ width: 350, boxShadow: '0 8px 20px rgba(0,0,0,0.12)', borderRadius: 2 }}
                            >
                                <strong>{n.title}</strong> — {n.message}
                            </Alert>
                        ))}
                    </Box>

                    {activeTab !== ActiveTab.CONNECTION && activeTab !== ActiveTab.MIGRATION && activeTab !== ActiveTab.PRICELISTS && parsedProducts.length > 0 && (
                        <DashboardStats stats={stats} />
                    )}

                    {activeTab === ActiveTab.MIGRATION ? (
                        <MigrationManager 
                            demoProducts={getDemoData()} 
                            liveProducts={liveProducts}
                            onRefreshLive={handleRefresh}
                        />
                    ) : (
                        <Box sx={{ flex: 1, bgcolor: 'background.paper', borderRadius: 4, border: 1, borderColor: 'divider', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: theme.shadows[1] }}>
                            {activeTab === ActiveTab.VARIANTS && (
                                <ProductTable 
                                    products={parsedProducts} 
                                    onUpdate={handleUpdateProduct} 
                                    onDelete={handleDeleteProduct}
                                    onAdd={handleCreateProduct}
                                    onNavigate={(t, q) => { setActiveTab(t); }}
                                    capabilities={appMode === 'live' ? capabilities : undefined}
                                    renderActions={appMode === 'demo' ? (selectedIds, clearSelection) => (
                                        <Button
                                            startIcon={<ArrowRightLeft size={16} />}
                                            onClick={() => { setActiveTab(ActiveTab.MIGRATION); }}
                                            size="small"
                                            sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                                        >
                                            Migration Tool
                                        </Button>
                                    ) : undefined}
                                />
                            )}
                            {activeTab === ActiveTab.ATTRIBUTES && (
                                <AttributeManager 
                                    products={parsedProducts}
                                    attributeConfigs={attributeConfigs}
                                    onUpdateAttributeName={()=>{}} 
                                    onUpdateAttributeValue={()=>{}} 
                                    onUpdateAttributeConfig={(n, c) => setAttributeConfigs(new Map(attributeConfigs.set(n, c)))}
                                />
                            )}
                            {activeTab === ActiveTab.TEMPLATES && (
                                <TemplateManager 
                                    products={parsedProducts}
                                    onUpdateTemplate={handleUpdateTemplate}
                                    onDeleteTemplates={handleDeleteTemplates}
                                    onMergeTemplates={handleMergeTemplates}
                                    onNavigate={(t, q) => { setActiveTab(t); }}
                                />
                            )}
                            {activeTab === ActiveTab.UOMS && (
                                <Box p={3} sx={{ height: '100%' }}><UomViewer /></Box>
                            )}
                            {activeTab === ActiveTab.PRICELISTS && (
                                <Box sx={{ height: '100%' }}><PricelistManager pricelists={pricelists} /></Box>
                            )}
                            {activeTab === ActiveTab.CONNECTION && (
                                <ConnectionManager 
                                    onDataFetched={(data, perms) => {
                                        setLiveProducts(data);
                                        setCurrencies([]); 
                                        if (perms) setCapabilities(perms);
                                        if (appMode === 'live') setParsedProducts(data);
                                        addNotification('success', 'Import Successful', `Loaded ${data.length} records.`);
                                    }} 
                                />
                            )}
                        </Box>
                    )}
                </Container>
           </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}