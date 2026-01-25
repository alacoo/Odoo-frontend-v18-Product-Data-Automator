
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Tags, Layers, Scale, Settings, Database, 
  Server, PlayCircle, RefreshCw, UploadCloud, FileJson, 
  ChevronLeft, ChevronRight, FileDown,
  Languages, Sparkles, Activity, Banknote, Coins, DollarSign,
  Menu, XCircle, Info, CheckCircle, ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ParsedProduct, ProcessingStep, ActiveTab, AppMode, Notification, OdooCurrency, OdooPricelist, SyncCapabilities } from '../types';
import { ProductTable } from '../components/ProductTable';
import { AttributeManager } from '../components/AttributeManager';
import { TemplateManager } from '../components/TemplateManager';
import { ExportConfigurator } from '../components/ExportConfigurator';
import { UomViewer } from '../components/UomViewer';
import { ConnectionManager } from '../components/ConnectionManager';
import { MigrationManager } from '../components/MigrationManager';
import { PricelistManager } from '../components/PricelistManager';
import { DashboardStats } from '../components/DashboardStats';
import { getDemoData, DEFAULT_RATES } from '../data/demoData';
import { 
    authenticateOdoo, 
    fetchOdooProducts,
    fetchOdooCurrencies, 
    fetchOdooPricelists,
    createOdooProduct, 
    updateOdooProduct, 
    deleteOdooProduct 
} from '../services/odooService';
import { getFullSettings } from '../services/settingsService';

interface ProductAutomatorDashboardProps {
    onBack: () => void;
    onError?: (error: any) => void;
    appMode?: AppMode; // Updated prop name to match guide
}

const ProductAutomatorDashboard: React.FC<ProductAutomatorDashboardProps> = ({ 
    onBack, 
    onError,
    appMode: propAppMode = 'demo' // Default to demo
}) => {
  const [appMode, setAppMode] = useState<AppMode>(propAppMode);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>(ProcessingStep.REVIEW);
  const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.VARIANTS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
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

  const addNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, title, message }]);
    
    // Auto dismiss
    setTimeout(() => {
        handleCloseNotification(id);
    }, 5000);
  };

  const handleCloseNotification = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    // Sync local state if prop changes
    if (propAppMode) setAppMode(propAppMode);
  }, [propAppMode]);

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
                if (onError) onError(e);
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
          if (onError) onError(e);
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
               const id = await createOdooProduct(newProduct);
               newProduct.id = String(id);
               addNotification('success', 'Created', 'Product created on Odoo');
           } catch (e: any) {
               addNotification('error', 'Create Failed', e.message);
               return;
           }
      }
      setParsedProducts(prev => [newProduct, ...prev]);
  };

  const handleUpdateProduct = async (id: string, field: keyof ParsedProduct, value: any) => {
      setParsedProducts(prev => prev.map(p => {
          if (p.id === id) {
              const updated = { ...p, [field]: value };
              if (appMode === 'live') {
                  updateOdooProduct(Number(id), updated).catch(e => {
                      addNotification('error', 'Update Failed', e.message);
                  });
              }
              return updated;
          }
          return p;
      }));
  };

  const handleDeleteProduct = async (id: string) => {
      if (appMode === 'live') {
          try {
              await deleteOdooProduct(Number(id));
              addNotification('success', 'Deleted', 'Product removed from Odoo');
          } catch (e: any) {
              addNotification('error', 'Delete Failed', e.message);
              return;
          }
      }
      setParsedProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleDeleteTemplates = (names: string[]) => { 
      setParsedProducts(prev => prev.filter(p => !names.includes(p.templateName))); 
      addNotification('success', 'Deleted', `Removed ${names.length} templates.`);
  };

  const handleMergeTemplates = (target: string, sources: string[]) => { 
      setParsedProducts(prev => prev.map(p => {
          if (sources.includes(p.templateName)) {
              return { ...p, templateName: target };
          }
          return p;
      }));
      addNotification('success', 'Merged', `Merged ${sources.length} templates into "${target}".`);
  };

  const handleUpdateTemplate = (oldName: string, field: keyof ParsedProduct, value: any) => { 
      setParsedProducts(prev => prev.map(p => {
          if (p.templateName === oldName) {
              return { ...p, [field]: value };
          }
          return p;
      }));
  };

  // Update stats 
  const stats = useMemo(() => {
    const usd = currencies.find(c => c.name === 'USD');
    const sar = currencies.find(c => c.name === 'SAR');
    const usdRate = usd && usd.inverse_rate ? Math.round(usd.inverse_rate) : DEFAULT_RATES.USD;
    const sarRate = sar && sar.inverse_rate ? Math.round(sar.inverse_rate) : DEFAULT_RATES.SAR;

    return [
        { label: 'Products', value: parsedProducts.length, icon: Tags, color: 'primary' },
        { label: 'Templates', value: new Set(parsedProducts.map(p => p.templateName)).size, icon: Layers, color: 'info' },
        { label: 'USD Rate', value: `${usdRate} YER`, icon: DollarSign, color: 'success' },
        { label: 'SAR Rate', value: `${sarRate} YER`, icon: Coins, color: 'warning' },
    ];
  }, [parsedProducts, currencies]);

  // --- Rendering ---

  if (currentStep === ProcessingStep.EXPORT_CONFIG) {
      return (
        <ExportConfigurator 
            products={parsedProducts} 
            attributeConfigs={attributeConfigs} 
            onBack={() => setCurrentStep(ProcessingStep.REVIEW)} 
        />
      );
  }

  // Determine Direction for icons
  const isRtl = document.dir === 'rtl';

  return (
      <div className="flex h-full bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-200 font-sans">
        
        {/* Navigation Sidebar */}
        <aside 
            className={`
                bg-white dark:bg-zinc-800 border-e border-gray-200 dark:border-zinc-700
                transform transition-all duration-300 ease-in-out flex flex-col z-20
                ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20'}
            `}
        >
          {/* Logo Area */}
          <div className="h-16 flex items-center gap-3 px-4 border-b border-gray-200 dark:border-zinc-700">
             <div onClick={onBack} className="p-2 cursor-pointer bg-primary-600 hover:bg-primary-700 rounded-lg text-white shadow-lg shadow-primary-500/20 transition-colors">
                 <Database size={20} strokeWidth={2.5} />
             </div>
             <span className={`font-extrabold text-lg tracking-tight bg-gradient-to-br from-primary-600 to-primary-400 bg-clip-text text-transparent transition-opacity duration-200 ${!isSidebarOpen && 'opacity-0 hidden'}`}>
                 DataFlow
             </span>
          </div>

          {/* Mode Switcher */}
          <div className="p-4">
             <div className="bg-gray-100 dark:bg-zinc-700/50 p-1 rounded-xl flex flex-col gap-1 transition-all">
                <button 
                    onClick={() => handleSwitchMode('demo')}
                    className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${appMode === 'demo' 
                            ? 'bg-white dark:bg-zinc-600 text-gray-900 dark:text-white shadow-sm' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }
                        ${!isSidebarOpen && 'justify-center'}
                    `}
                >
                    <PlayCircle size={18} />
                    {isSidebarOpen && <span>Demo</span>}
                </button>
                <button 
                    onClick={() => handleSwitchMode('live')}
                    className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${appMode === 'live' 
                            ? 'bg-white dark:bg-zinc-600 text-red-600 dark:text-red-400 shadow-sm' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-red-600'
                        }
                        ${!isSidebarOpen && 'justify-center'}
                    `}
                >
                    <Server size={18} />
                    {isSidebarOpen && <span>Live</span>}
                </button>
             </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 px-3 overflow-y-auto">
              <ul className="space-y-1">
              {[
                  { id: ActiveTab.VARIANTS, label: 'Products', icon: LayoutDashboard },
                  { id: ActiveTab.TEMPLATES, label: 'Templates', icon: Layers },
                  { id: ActiveTab.ATTRIBUTES, label: 'Attributes', icon: Tags },
                  { id: ActiveTab.UOMS, label: 'Units', icon: Scale },
                  { id: ActiveTab.PRICELISTS, label: 'Pricelists', icon: Banknote },
                  { id: ActiveTab.MIGRATION, label: 'Migration', icon: ArrowRight },
                  { id: ActiveTab.CONNECTION, label: 'Connection', icon: Settings },
              ].map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                      <li key={item.id}>
                          <button 
                              onClick={() => setActiveTab(item.id as ActiveTab)}
                              className={`
                                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                  ${isActive 
                                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
                                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700/50'
                                  }
                                  ${!isSidebarOpen && 'justify-center px-2'}
                              `}
                          >
                              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                              {isSidebarOpen && <span>{item.label}</span>}
                          </button>
                      </li>
                  );
              })}
              </ul>
          </nav>

          {/* Footer / Collapse */}
          <div className="p-4 border-t border-gray-200 dark:border-zinc-700">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500 dark:text-gray-400 transition-colors"
              >
                 {isRtl
                    ? (isSidebarOpen ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>)
                    : (isSidebarOpen ? <ChevronLeft size={20}/> : <ChevronRight size={20}/>)
                 }
              </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
           
           {/* Top Navigation Bar */}
           <header className="h-16 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between px-4 sm:px-6 z-10">
               
               {/* Context Title */}
               <div className="flex items-center gap-4">
                    {!isSidebarOpen && (
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ms-2 text-gray-500">
                            <Menu size={20} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <button onClick={onBack} className="hover:bg-gray-100 dark:hover:bg-zinc-700 p-1 rounded-md transition-colors">
                                <ChevronLeft className="rtl:rotate-180" size={20} />
                            </button>
                            
                            {activeTab === ActiveTab.VARIANTS && 'Product Management'}
                            {activeTab === ActiveTab.TEMPLATES && 'Template Structure'}
                            {activeTab === ActiveTab.ATTRIBUTES && 'Attribute Config'}
                            {activeTab === ActiveTab.UOMS && 'Units of Measure'}
                            {activeTab === ActiveTab.PRICELISTS && 'Pricelists Manager'}
                            {activeTab === ActiveTab.CONNECTION && 'Backend Connection'}
                            {activeTab === ActiveTab.MIGRATION && 'Migration Tool'}
                            
                            <span className="h-5 w-px bg-gray-300 dark:bg-zinc-600 mx-1 hidden sm:block"></span>

                            {appMode === 'demo' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                    <Sparkles size={12} fill="currentColor" /> Sandbox
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-100 dark:border-red-800 animate-pulse">
                                    <Activity size={12} /> Live Data
                                </span>
                            )}
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">
                            {parsedProducts.length} records available • {currencies.length} currencies
                        </p>
                    </div>
               </div>

               {/* Actions Toolbar */}
               <div className="flex items-center gap-2">
                   <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".csv,.xlsx,.xls" />
                   
                   <button title="Import Excel/CSV" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                        <UploadCloud size={18} />
                   </button>

                   <button title="Export Raw Data" onClick={handleExportRawData} className="p-2 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                        <FileJson size={18} />
                   </button>
                   
                   {appMode === 'live' && (
                       <button 
                            title="Refresh Data"
                            onClick={handleRefresh} 
                            disabled={isAutoConnecting} 
                            className={`p-2 text-primary-600 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 transition-colors ${isAutoConnecting ? 'animate-spin' : ''}`}
                        >
                           <RefreshCw size={18} />
                       </button>
                   )}
                   
                   <button 
                       onClick={() => setCurrentStep(ProcessingStep.EXPORT_CONFIG)}
                       disabled={parsedProducts.length === 0}
                       className="hidden sm:flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-primary-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                       <FileDown size={18} />
                       <span>Generate Files</span>
                   </button>
               </div>
           </header>

           {/* Dashboard Content */}
           <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-zinc-900">
                <div className="max-w-[1600px] mx-auto flex flex-col gap-6 h-full">
                    
                    {/* Notifications Toast */}
                    <div className="fixed bottom-6 end-6 z-[100] flex flex-col gap-2 pointer-events-none">
                        {notifications.map(n => (
                            <div 
                                key={n.id} 
                                className={`
                                    pointer-events-auto w-80 p-4 rounded-xl shadow-lg border flex gap-3 animate-in slide-in-from-right-10 fade-in
                                    ${n.type === 'error' ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/90 dark:border-red-800 dark:text-red-100' : ''}
                                    ${n.type === 'success' ? 'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/90 dark:border-green-800 dark:text-green-100' : ''}
                                    ${n.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/90 dark:border-blue-800 dark:text-blue-100' : ''}
                                `}
                            >
                                <div className="mt-0.5 shrink-0">
                                    {n.type === 'error' && <XCircle size={20} />}
                                    {n.type === 'success' && <CheckCircle size={20} />}
                                    {n.type === 'info' && <Info size={20} />}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm mb-0.5">{n.title}</h4>
                                    <p className="text-xs opacity-90 leading-snug">{n.message}</p>
                                </div>
                                <button onClick={() => handleCloseNotification(n.id)} className="shrink-0 opacity-50 hover:opacity-100">
                                    <XCircle size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Statistics Cards */}
                    {activeTab !== ActiveTab.CONNECTION && activeTab !== ActiveTab.MIGRATION && activeTab !== ActiveTab.PRICELISTS && parsedProducts.length > 0 && (
                        <DashboardStats stats={stats} />
                    )}

                    {/* Main Workspace */}
                    <div className="flex-1 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm overflow-hidden flex flex-col relative">
                        {activeTab === ActiveTab.MIGRATION ? (
                            <MigrationManager 
                                demoProducts={getDemoData()} 
                                liveProducts={liveProducts}
                                onRefreshLive={handleRefresh}
                            />
                        ) : (
                           <>
                            {activeTab === ActiveTab.VARIANTS && (
                                <ProductTable 
                                    products={parsedProducts} 
                                    onUpdate={handleUpdateProduct} 
                                    onDelete={handleDeleteProduct}
                                    onAdd={handleCreateProduct}
                                    onNavigate={(t, q) => { setActiveTab(t); }}
                                    capabilities={appMode === 'live' ? capabilities : undefined}
                                    renderActions={(selectedIds, clearSelection) => (
                                        <>
                                            {appMode === 'demo' && (
                                                <button
                                                    onClick={() => { setActiveTab(ActiveTab.MIGRATION); }}
                                                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                                                >
                                                    <Languages size={14} /> Migration Tool
                                                </button>
                                            )}
                                        </>
                                    )}
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
                                <div className="h-full p-0"><UomViewer /></div>
                            )}
                            {activeTab === ActiveTab.PRICELISTS && (
                                <div className="h-full"><PricelistManager pricelists={pricelists} /></div>
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
                           </>
                        )}
                    </div>
                </div>
           </div>
        </main>
      </div>
  );
};

export default ProductAutomatorDashboard;
