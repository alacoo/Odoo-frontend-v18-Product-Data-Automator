
import React, { useState } from 'react';
import { OdooConfig, ParsedProduct, SystemHealthReport, PreCheckResult, SyncCapabilities } from '../types';
import { authenticateOdoo, fetchOdooProducts, fetchOdooCurrencies, checkSystemHealth, runSyncPreCheck } from '../services/odooService';
import { saveSettings, getFullSettings } from '../services/settingsService';
import { 
    Server, Wifi, Database, Lock, User, Globe, ArrowRight, ShieldCheck, 
    Zap, AlertTriangle, Activity, CheckCircle2, XCircle, Loader2, Check
} from 'lucide-react';

interface Props {
  onDataFetched: (products: ParsedProduct[], capabilities: SyncCapabilities) => void;
}

// Error Messages Dictionary
const ERROR_MESSAGES_AR: Record<string, string> = {
  'MISSING_HEADER': 'يرجى إدخال جميع البيانات المطلوبة',
  'AUTH_FAILED': 'بيانات الدخول غير صحيحة',
  'AUTH_NO_KEY': 'يرجى تسجيل الدخول أولاً',
  'AUTH_INVALID_KEY': 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول',
  'DATABASE_NOT_FOUND': 'قاعدة البيانات غير موجودة',
  'DATABASE_CONNECTION_FAILED': 'فشل الاتصال بخادم قاعدة البيانات',
  'DATABASE_SERVER_ERROR': 'خطأ في خادم قاعدة البيانات',
  'BAD_REQUEST': 'طلب غير صالح',
  'INVALID_MODEL': 'الموديل غير موجود',
  'CONFIG_NOT_FOUND': 'إعدادات REST API مفقودة لهذا الموديل',
  'ACCESS_DENIED': 'ليس لديك صلاحية لهذه العملية',
  'METHOD_NOT_ALLOWED': 'هذه العملية غير مسموحة',
  'INTERNAL_SERVER_ERROR': 'خطأ داخلي في الخادم',
  'NETWORK_ERROR': 'فشل الاتصال بالشبكة، تحقق من الإنترنت أو إعدادات CORS'
};

export const ConnectionManager: React.FC<Props> = ({ onDataFetched }) => {
  const [config, setConfig] = useState<OdooConfig>(getFullSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // New State for Health Check
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [preCheckResult, setPreCheckResult] = useState<PreCheckResult | null>(null);
  const [showHealthModal, setShowHealthModal] = useState(false);

  // --- Profile Management ---
  const [profiles] = useState<OdooConfig[]>([
      { name: 'Production', url: 'https://odoo1.smartsoftapp.cloud', db: 'odoo1', username: 'borihy@gmail.com', password: 'admin', enablePricelists: true },
      { name: 'Staging', url: 'https://odoo3.borihy.com', db: 'odoo5', username: 'borihy@gamil.com', password: 'admin', enablePricelists: true }
  ]);

  const loadProfile = (p: OdooConfig) => {
      setConfig({ ...config, ...p });
      setStatus('idle');
      setMessage('');
      setErrorDetails(null);
  };

  const handleConnect = async () => {
    if (!config.password) {
        setStatus('error');
        setMessage('كلمة المرور مطلوبة');
        return;
    }

    setIsLoading(true);
    setStatus('idle');
    setMessage('');
    setErrorDetails(null);
    setHealthReport(null);
    setPreCheckResult(null);
    saveSettings(config);

    try {
      await authenticateOdoo();
      setMessage(`تم تسجيل الدخول! جاري التحقق من صحة النظام...`);

      // Run System Health Check
      const report = await checkSystemHealth();
      setHealthReport(report);

      // Analyze Result
      const checkResult = runSyncPreCheck(report);
      setPreCheckResult(checkResult);

      if (checkResult.canSync) {
         setMessage(`تم الاتصال بنجاح. جاري جلب البيانات...`);
         const [products, currencies] = await Promise.all([
            fetchOdooProducts(),
            fetchOdooCurrencies()
          ]);
         
         setMessage(`تمت المزامنة بنجاح: ${products.length} منتج`);
         setStatus('success');
         
         // If there are warnings, show modal first
         if (checkResult.warnings.length > 0 || report.status === 'warning') {
             setShowHealthModal(true);
         } else {
             setTimeout(() => {
                 onDataFetched(products, checkResult.capabilities);
             }, 1000);
         }
      } else {
          // Critical issues block sync
          setStatus('error');
          setMessage('فشل التحقق من النظام. يرجى مراجعة الأخطاء الحرجة.');
          setShowHealthModal(true);
      }
      
    } catch (error: any) {
      setStatus('error');
      
      let displayMsg = ERROR_MESSAGES_AR[error.code] || error.message || "فشل الاتصال";
      if (error.code === 'CONFIG_NOT_FOUND' && error.message) {
         displayMsg += ` (${error.message})`;
      }
      
      setMessage(displayMsg);
      if (error.code && !ERROR_MESSAGES_AR[error.code]) {
          setErrorDetails(`Code: ${error.code}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const activeProfileIndex = profiles.findIndex(p => p.url === config.url && p.db === config.db);

  return (
    <div className="flex h-full w-full items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-200 dark:from-zinc-900 dark:to-zinc-950 font-sans">
      
      {/* System Health Dialog Modal */}
      {showHealthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
                    <Activity size={24} className={!preCheckResult?.canSync ? "text-red-500" : "text-primary-600"} />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">System Health & Compliance Report</h2>
                    {healthReport?.odoo_version && (
                        <span className="ms-auto bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs font-mono">v{healthReport.odoo_version}</span>
                    )}
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {preCheckResult && (
                        <div className="space-y-6">
                            {/* Critical Issues */}
                            {preCheckResult.criticalIssues.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold mb-2">
                                        <AlertTriangle size={20} /> Critical Configuration Issues
                                    </div>
                                    <p className="text-sm text-red-600 dark:text-red-300 mb-3">Synchronization cannot proceed until these are fixed.</p>
                                    
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-red-800 dark:text-red-200 font-semibold border-b border-red-200 dark:border-red-800">
                                                <tr>
                                                    <th className="pb-2">Model</th>
                                                    <th className="pb-2">Issue</th>
                                                    <th className="pb-2">Solution</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-200 dark:divide-red-800">
                                                {preCheckResult.criticalIssues.map((issue, idx) => (
                                                    <tr key={idx}>
                                                        <td className="py-2 font-mono">{issue.model}</td>
                                                        <td className="py-2">{issue.message_en}</td>
                                                        <td className="py-2 font-bold">{issue.action}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Warnings */}
                            {preCheckResult.warnings.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold mb-2">
                                        <AlertTriangle size={20} /> Capabilities Limitation
                                    </div>
                                    <p className="text-sm text-amber-600 dark:text-amber-300 mb-3">The connection is successful, but some features will be restricted.</p>
                                    <ul className="space-y-1">
                                        {preCheckResult.warnings.map((w, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                                                <span className="mt-0.5">•</span>
                                                <span>{w.message_en} <span className="opacity-70">({w.impact})</span></span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Capabilities */}
                            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 border border-gray-200 dark:border-zinc-700">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Authenticated Capabilities</h3>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(preCheckResult.capabilities).map(([key, val]) => (
                                        <span 
                                            key={key} 
                                            className={`
                                                flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold
                                                ${val 
                                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' 
                                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 opacity-60'
                                                }
                                            `}
                                        >
                                            {val ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                            {key.replace('can', '').toUpperCase()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3 bg-gray-50 dark:bg-zinc-900">
                    <button 
                        onClick={() => setShowHealthModal(false)}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
                    >
                        Close
                    </button>
                    {preCheckResult?.canSync && (
                        <button 
                            onClick={() => { setShowHealthModal(false); fetchOdooProducts().then((p) => onDataFetched(p, preCheckResult!.capabilities)); }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-bold shadow-lg shadow-primary-600/20"
                        >
                            Proceed Anyway <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      <div className="w-full max-w-5xl bg-white dark:bg-zinc-800 rounded-3xl shadow-xl border border-gray-100 dark:border-zinc-700 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          
          {/* Left Panel: Branding & Profiles */}
          <div className="md:w-2/5 bg-primary-600 p-8 text-white flex flex-col relative overflow-hidden">
              {/* Abstract Shapes */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/10 shadow-inner">
                          <Server size={28} className="text-white" />
                      </div>
                      <h1 className="text-2xl font-extrabold tracking-tight">Odoo Connector</h1>
                  </div>
                  <p className="text-primary-100 text-sm mb-8 leading-relaxed opacity-90">
                      Sync product data seamlessly with Odoo v18 via secure JSON-RPC protocol.
                  </p>

                  <div className="space-y-3">
                      {profiles.map((p, i) => (
                          <button
                              key={i}
                              onClick={() => loadProfile(p)}
                              className={`
                                  w-full text-start p-4 rounded-xl border transition-all duration-200 group
                                  ${activeProfileIndex === i 
                                      ? 'bg-white text-primary-700 border-white shadow-lg' 
                                      : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                                  }
                              `}
                          >
                              <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2 font-bold">
                                      {i === 0 ? <ShieldCheck size={18} /> : <Zap size={18} />}
                                      {p.name}
                                  </div>
                                  {activeProfileIndex === i && <ArrowRight size={18} className="animate-in slide-in-from-left-2" />}
                              </div>
                              <div className={`text-xs font-mono truncate opacity-70 group-hover:opacity-100 ${activeProfileIndex === i ? 'text-primary-600' : 'text-primary-200'}`}>
                                  {p.db}
                              </div>
                          </button>
                      ))}
                  </div>
              </div>

              <div className="mt-auto pt-8 text-[10px] text-primary-200 text-center relative z-10">
                  Secure JSON-RPC Protocol • Odoo v18 Compatible
              </div>
          </div>

          {/* Right Panel: Form */}
          <div className="md:w-3/5 p-8 lg:p-12 flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connection Settings</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Enter your Odoo instance credentials to establish a secure connection.</p>

              <div className="space-y-5">
                  <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Server URL</label>
                      <div className="relative">
                          <Globe size={18} className="absolute inset-y-0 left-3 my-auto text-gray-400 pointer-events-none" />
                          <input 
                              type="text" 
                              placeholder="https://odoo.example.com"
                              value={config.url}
                              onChange={e => setConfig({...config, url: e.target.value})}
                              className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-700/50 border border-gray-200 dark:border-zinc-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Database</label>
                          <div className="relative">
                              <Database size={18} className="absolute inset-y-0 left-3 my-auto text-gray-400 pointer-events-none" />
                              <input 
                                  type="text" 
                                  value={config.db}
                                  onChange={e => setConfig({...config, db: e.target.value})}
                                  className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-700/50 border border-gray-200 dark:border-zinc-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                              />
                          </div>
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Login (Email)</label>
                          <div className="relative">
                              <User size={18} className="absolute inset-y-0 left-3 my-auto text-gray-400 pointer-events-none" />
                              <input 
                                  type="text" 
                                  value={config.username}
                                  onChange={e => setConfig({...config, username: e.target.value})}
                                  className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-700/50 border border-gray-200 dark:border-zinc-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                              />
                          </div>
                      </div>
                  </div>

                  <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password / API Key</label>
                      <div className="relative">
                          <Lock size={18} className="absolute inset-y-0 left-3 my-auto text-gray-400 pointer-events-none" />
                          <input 
                              type="password" 
                              value={config.password || ''}
                              onChange={e => setConfig({...config, password: e.target.value})}
                              className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-700/50 border border-gray-200 dark:border-zinc-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                          />
                      </div>
                  </div>

                  {/* Feature Toggle */}
                  <div className="bg-gray-50 dark:bg-zinc-700/30 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 flex items-start gap-3">
                      <div className="p-1 text-amber-500 mt-0.5">
                          <AlertTriangle size={16} />
                      </div>
                      <div className="flex-1">
                          <label className="flex items-center gap-2 cursor-pointer mb-1">
                              <input 
                                  type="checkbox" 
                                  checked={config.enablePricelists || false} 
                                  onChange={e => setConfig({...config, enablePricelists: e.target.checked})}
                                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                              />
                              <span className="font-bold text-sm text-gray-800 dark:text-gray-200">Enable Pricelists (Experimental)</span>
                          </label>
                          {config.enablePricelists && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 animate-in fade-in slide-in-from-top-1">
                                  Sync multi-currency prices (USD, SAR). May impact performance.
                              </p>
                          )}
                      </div>
                  </div>
              </div>

              <div className="mt-8 space-y-4">
                  <button 
                      onClick={handleConnect}
                      disabled={isLoading}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                      {isLoading ? (
                          <>
                              <Loader2 size={20} className="animate-spin" /> Verifying Connection...
                          </>
                      ) : (
                          <>
                              <Wifi size={20} /> Connect to Database
                          </>
                      )}
                  </button>

                  {status !== 'idle' && (
                      <div className={`p-4 rounded-xl border flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${
                          status === 'success' 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                      }`}>
                          <div className="mt-0.5">
                              {status === 'success' ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                          </div>
                          <div className="flex-1">
                              <h4 className="font-bold text-sm mb-0.5">
                                  {status === 'success' ? 'Connection Successful' : 'Connection Failed'}
                              </h4>
                              <p className="text-xs opacity-90">{message}</p>
                              {errorDetails && <p className="text-[10px] font-mono mt-1 opacity-70 p-1 bg-black/5 rounded">{errorDetails}</p>}
                          </div>
                          {(status === 'success' || preCheckResult) && (
                              <button onClick={() => setShowHealthModal(true)} className="text-xs font-bold underline self-start whitespace-nowrap">
                                  Review Report
                              </button>
                          )}
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
