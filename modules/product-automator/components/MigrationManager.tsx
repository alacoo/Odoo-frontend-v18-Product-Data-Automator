
import React, { useState, useEffect, useRef } from 'react';
import { 
    ParsedProduct, OdooAttribute, OdooAttributeValue, 
    MigrationState, MigrationPhase, MigrationTask, MigrationLog, UomConflict 
} from '../types';
import { 
    createOdooAttribute, createOdooAttributeValue, createOdooTemplate, 
    fetchOdooAttributes, fetchOdooAttributeValues, waitForProductVariants, 
    updateOdooProduct, fetchOdooUoms, createOdooUom, delay
} from '../services/odooService';
import { 
    ArrowRight, CheckCircle2, Play, 
    Loader2, AlertCircle, Download, PauseCircle, PlayCircle, 
    Trash2, Search, Activity, Plus, FileText, Check, AlertTriangle
} from 'lucide-react';

// --- Constants ---
const STORAGE_KEY = 'odoo_migration_state_v1';
const MAX_LOGS = 500;
const MAX_RETRIES = 3;

interface Props {
  demoProducts: ParsedProduct[];
  liveProducts: ParsedProduct[];
  onRefreshLive: () => Promise<void>;
}

// --- Initial State Factory ---
const createInitialState = (): MigrationState => ({
    id: crypto.randomUUID(),
    phase: 'IDLE',
    progress: 0,
    uomConflicts: [],
    tasks: [],
    logs: [],
    currentTaskIndex: 0,
    lastUpdated: Date.now()
});

export const MigrationManager: React.FC<Props> = ({ demoProducts, onRefreshLive }) => {
  // --- Persistent State Management ---
  const [state, setState] = useState<MigrationState>(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : createInitialState();
  });

  const [odooUoms, setOdooUoms] = useState<{id: number, name: string}[]>([]);
  const [odooAttributes, setOdooAttributes] = useState<OdooAttribute[]>([]);
  const [odooValues, setOdooValues] = useState<OdooAttributeValue[]>([]);
  
  // UI References
  const logEndRef = useRef<HTMLDivElement>(null);

  // Persist State Effect
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Scroll logs
  useEffect(() => {
      if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [state.logs]);

  // --- Actions ---

  const addLog = (level: MigrationLog['level'], message: string, details?: any) => {
      setState(prev => {
          const newLog: MigrationLog = { timestamp: Date.now(), level, message, details };
          const newLogs = [...prev.logs, newLog].slice(-MAX_LOGS); // Keep last N logs
          return { ...prev, logs: newLogs, lastUpdated: Date.now() };
      });
  };

  const updateState = (updates: Partial<MigrationState>) => {
      setState(prev => ({ ...prev, ...updates, lastUpdated: Date.now() }));
  };

  const resetMigration = () => {
      if (confirm("Are you sure? This will clear current progress and logs.")) {
          setState(createInitialState());
          localStorage.removeItem(STORAGE_KEY);
      }
  };

  const downloadLogs = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.logs, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `migration_logs_${state.id}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  // --- Phase 1: Analysis ---

  const runAnalysis = async () => {
      updateState({ phase: 'ANALYZING', logs: [], uomConflicts: [], tasks: [], progress: 0 });
      addLog('info', 'Starting Analysis Phase...');

      try {
          // 1. Fetch Metadata
          addLog('info', 'Fetching Odoo Metadata...');
          const [attrs, vals, uoms] = await Promise.all([
              fetchOdooAttributes(),
              fetchOdooAttributeValues(),
              fetchOdooUoms()
          ]);
          setOdooAttributes(attrs);
          setOdooValues(vals);
          setOdooUoms(uoms);

          // 2. Identify UOM Conflicts (Fail Fast)
          const localUoms = new Set<string>(demoProducts.map(p => p.uom));
          const conflicts: UomConflict[] = [];
          const uomList = uoms as {id: number, name: string}[];

          localUoms.forEach((localUom) => {
              const exactMatch = uomList.find(u => u.name.toLowerCase() === localUom.toLowerCase());
              if (!exactMatch) {
                  // Heuristic Checks
                  let resolvedId: number | null = null;
                  const normalized = localUom.toLowerCase();
                  if (normalized === 'piece' || normalized === 'unit') resolvedId = uomList.find(u => u.name.toLowerCase().includes('unit'))?.id || null;
                  
                  if (!resolvedId) {
                      conflicts.push({ localUom, resolvedOdooId: null });
                  }
              }
          });

          if (conflicts.length > 0) {
              addLog('warn', `Found ${conflicts.length} UOM conflicts. User resolution required.`);
              updateState({ phase: 'RESOLVING', uomConflicts: conflicts });
              return; // Stop here
          }

          // 3. Build Task Plan
          buildExecutionPlan(attrs, vals, uoms);

      } catch (e: any) {
          addLog('error', `Analysis Failed: ${e.message}`);
          updateState({ phase: 'IDLE' });
      }
  };

  const resolveConflict = (localUom: string, odooId: number) => {
      setState(prev => ({
          ...prev,
          uomConflicts: prev.uomConflicts.map(c => c.localUom === localUom ? { ...c, resolvedOdooId: odooId } : c)
      }));
  };

  const handleCreateUom = async (localName: string) => {
      try {
          addLog('info', `Creating new UOM in Odoo: ${localName}...`);
          const newId = await createOdooUom(localName);
          if (newId) {
              const newUom = { id: newId, name: localName };
              setOdooUoms(prev => [...prev, newUom]);
              resolveConflict(localName, newId);
              addLog('success', `Created UOM: ${localName}`);
          }
      } catch (e: any) {
          addLog('error', `Failed to create UOM ${localName}: ${e.message}`);
      }
  };

  const finishResolution = () => {
      const unresolved = state.uomConflicts.filter(c => c.resolvedOdooId === null);
      if (unresolved.length > 0) {
          alert(`Please resolve all UOM conflicts before proceeding.`);
          return;
      }
      addLog('success', 'UOM Conflicts Resolved.');
      buildExecutionPlan(odooAttributes, odooValues, odooUoms);
  };

  const buildExecutionPlan = (attrs: OdooAttribute[], vals: OdooAttributeValue[], uoms: any[]) => {
      const tasks: MigrationTask[] = [];

      // A. Attributes & Values
      const localAttrsMap = new Map<string, Set<string>>();
      demoProducts.forEach(p => {
          p.attributes.forEach(a => {
              if (!localAttrsMap.has(a.name)) localAttrsMap.set(a.name, new Set());
              localAttrsMap.get(a.name)?.add(a.value);
          });
      });

      localAttrsMap.forEach((values, name) => {
          const existingAttr = attrs.find(oa => oa.name.toLowerCase() === name.toLowerCase());
          
          if (!existingAttr) {
              tasks.push({ 
                  id: `attr_${name}`, type: 'attribute', name, 
                  data: { name }, status: 'pending', retries: 0 
              });
          }

          values.forEach(val => {
              const valExists = existingAttr 
                ? vals.some(ov => ov.attribute_id[0] === existingAttr.id && ov.name.toLowerCase() === val.toLowerCase())
                : false; // If attr doesn't exist, value surely doesn't
              
              if (!valExists) {
                  tasks.push({
                      id: `val_${name}_${val}`, type: 'value', name: `${name}: ${val}`,
                      data: { attrName: name, valName: val }, status: 'pending', retries: 0
                  });
              }
          });
      });

      // B. Templates
      const localTemplatesMap = new Map<string, ParsedProduct[]>();
      demoProducts.forEach(p => {
          if (!localTemplatesMap.has(p.templateName)) localTemplatesMap.set(p.templateName, []);
          localTemplatesMap.get(p.templateName)?.push(p);
      });

      localTemplatesMap.forEach((variants, tmplName) => {
          tasks.push({
              id: `tmpl_${tmplName}`, type: 'template', name: tmplName,
              data: { tmplName, variants }, status: 'pending', retries: 0
          });
      });

      addLog('info', `Plan Built: ${tasks.length} tasks generated.`);
      updateState({ phase: 'IDLE', tasks, currentTaskIndex: 0, progress: 0 }); // Go to Ready state
  };

  // --- Phase 2: Execution (The Loop) ---

  const startMigration = () => {
      updateState({ phase: 'MIGRATING' });
  };

  const pauseMigration = () => {
      updateState({ phase: 'PAUSED' });
      addLog('warn', 'Migration Paused by User.');
  };

  // The Heartbeat Effect
  useEffect(() => {
      if (state.phase !== 'MIGRATING') return;

      const executeNext = async () => {
          if (state.currentTaskIndex >= state.tasks.length) {
              updateState({ phase: 'DONE', progress: 100 });
              addLog('success', 'All tasks completed successfully!');
              onRefreshLive();
              return;
          }

          const task = state.tasks[state.currentTaskIndex];
          if (task.status === 'success' || task.status === 'skipped') {
              updateState({ currentTaskIndex: state.currentTaskIndex + 1 });
              return;
          }

          // Execute Task
          addLog('info', `Processing [${task.type}]: ${task.name}...`);
          
          try {
              // --- Logic Switch ---
              if (task.type === 'attribute') {
                  const id = await createOdooAttribute(task.data.name);
                  setOdooAttributes(prev => [...prev, { id, name: task.data.name, display_type: 'select' }]);
              } 
              else if (task.type === 'value') {
                  const attr = odooAttributes.find(a => a.name.toLowerCase() === task.data.attrName.toLowerCase());
                  if (!attr) throw new Error(`Attribute ${task.data.attrName} not found (dependency failed)`);
                  
                  const id = await createOdooAttributeValue(attr.id, task.data.valName);
                  setOdooValues(prev => [...prev, { id, name: task.data.valName, attribute_id: [attr.id, attr.name] }]);
              }
              else if (task.type === 'template') {
                  await processTemplateTask(task, odooAttributes, odooValues, state.uomConflicts, odooUoms);
              }

              // Success Handling
              const updatedTasks = [...state.tasks];
              updatedTasks[state.currentTaskIndex] = { ...task, status: 'success' };
              
              const progress = Math.round(((state.currentTaskIndex + 1) / state.tasks.length) * 100);
              
              setState(prev => ({ 
                  ...prev, 
                  tasks: updatedTasks, 
                  currentTaskIndex: prev.currentTaskIndex + 1,
                  progress
              }));

              await delay(200);

          } catch (e: any) {
              const updatedTasks = [...state.tasks];
              const retryCount = task.retries + 1;
              
              if (retryCount <= MAX_RETRIES) {
                   addLog('warn', `Task failed. Retrying (${retryCount}/${MAX_RETRIES})...`, e.message);
                   updatedTasks[state.currentTaskIndex] = { ...task, retries: retryCount };
                   setState(prev => ({ ...prev, tasks: updatedTasks }));
                   await delay(1000 * retryCount); // Exponential backoff
              } else {
                   addLog('error', `CRITICAL FAILURE on ${task.name}: ${e.message}`);
                   updatedTasks[state.currentTaskIndex] = { ...task, status: 'failed', error: e.message };
                   // STOP EVERYTHING
                   setState(prev => ({ ...prev, tasks: updatedTasks, phase: 'PAUSED' }));
              }
          }
      };

      executeNext();
  }, [state.phase, state.currentTaskIndex, state.tasks, odooAttributes, odooValues]);

  // --- Logic Helper for Templates ---
  const processTemplateTask = async (
      task: MigrationTask, 
      currentAttrs: OdooAttribute[], 
      currentVals: OdooAttributeValue[],
      conflicts: UomConflict[],
      uoms: any[]
  ) => {
      const { tmplName, variants } = task.data;
      const baseProduct = variants[0];

      // 1. Resolve UOM
      let uomId = 1;
      const conflict = conflicts.find(c => c.localUom === baseProduct.uom);
      if (conflict && conflict.resolvedOdooId) {
          uomId = conflict.resolvedOdooId;
      } else {
          // Try to find exact match
          const exact = uoms.find(u => u.name.toLowerCase() === baseProduct.uom.toLowerCase());
          if (exact) uomId = exact.id;
      }

      // 2. Prepare Attributes Line
      const attribute_line_ids: any[] = [];
      const usedAttributes = new Map<string, Set<string>>();
      variants.forEach((v: ParsedProduct) => {
          v.attributes.forEach(a => {
              if (!usedAttributes.has(a.name)) usedAttributes.set(a.name, new Set());
              usedAttributes.get(a.name)?.add(a.value);
          });
      });

      usedAttributes.forEach((vals, name) => {
          const attr = currentAttrs.find(a => a.name.toLowerCase() === name.toLowerCase());
          if (attr) {
               const valIds: number[] = [];
               vals.forEach(v => {
                   const val = currentVals.find(ov => ov.attribute_id[0] === attr.id && ov.name.toLowerCase() === v.toLowerCase());
                   if (val) valIds.push(val.id);
               });
               if (valIds.length > 0) {
                   attribute_line_ids.push([0, 0, { attribute_id: attr.id, value_ids: [[6, 0, valIds]] }]);
               }
          }
      });

      // 3. Create Template
      let tmplId = 0;
      
      const payloadBase = {
          name: tmplName,
          uom_id: uomId,
          uom_po_id: uomId,
          list_price: baseProduct.price || 0,
          standard_price: baseProduct.standard_price || 0,
          attribute_line_ids: attribute_line_ids,
          sale_ok: true,
          purchase_ok: true,
          taxes_id: [[6, 0, []]],
          categ_id: 1
      };

      try {
           // Attempt 1: Try with 'detailed_type' (Standard for v18)
           tmplId = await createOdooTemplate({
               ...payloadBase,
               detailed_type: baseProduct.detailedType || 'product',
               tracking: baseProduct.tracking
           });
      } catch (err: any) {
           const errMsg = (err.message || "").toLowerCase();
           
           if (errMsg.includes("wrong value") || errMsg.includes("selection") || errMsg.includes("not a valid")) {
               if ((baseProduct.detailedType === 'product' || !baseProduct.detailedType)) {
                   addLog('warn', `Odoo rejected 'Storable' type for '${tmplName}'. Missing Inventory app?`);
                   addLog('info', `Action: Auto-downgrading to 'Consumable' to continue migration...`);
                   
                   tmplId = await createOdooTemplate({
                       ...payloadBase,
                       detailed_type: 'consu',
                       tracking: 'none'
                   });
               } else {
                   throw err;
               }
           } else {
               throw err;
           }
      }

      // 4. Wait for Variants & Update Codes
      if (variants.length > 0) {
           const generatedVariants = await waitForProductVariants(tmplId, variants.length);
           for (const genVar of generatedVariants) {
                const match = variants.find((local: ParsedProduct) => {
                    const dn = (genVar.display_name || "").toLowerCase();
                    return local.attributes.every(a => dn.includes(a.value.toLowerCase()));
                });

                if (match) {
                     await updateOdooProduct(genVar.id, {
                         defaultCode: match.defaultCode,
                         barcode: match.barcode,
                         weight: Number(match.weight) || 0,
                         standard_price: match.standard_price
                     });
                }
           }
      }
  };

  const getPhaseLabel = (phase: MigrationPhase) => {
      switch(phase) {
          case 'IDLE': return 'Ready';
          case 'ANALYZING': return 'Analyzing Structure';
          case 'RESOLVING': return 'User Input Needed';
          case 'MIGRATING': return 'Executing Migration';
          case 'PAUSED': return 'Paused / Failed';
          case 'DONE': return 'Completed';
          default: return phase;
      }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-800 font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between bg-white dark:bg-zinc-800 shadow-sm">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
                  <Activity size={24} />
              </div>
              <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Migration Manager</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Session ID: <span className="font-mono text-purple-600 dark:text-purple-400">{state.id.split('-')[0]}</span> • Status: <span className="font-bold">{getPhaseLabel(state.phase)}</span>
                  </p>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <button 
                onClick={resetMigration} 
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
              >
                  <Trash2 size={16} /> Reset
              </button>
              <button 
                onClick={downloadLogs} 
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
              >
                  <Download size={16} /> Logs
              </button>
          </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col flex-1 p-6 gap-6 overflow-hidden bg-gray-50 dark:bg-zinc-900/50">
          
          {/* Phase 1: UOM Conflict Resolution */}
          {state.phase === 'RESOLVING' && (
              <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-700 flex flex-col flex-1 overflow-hidden">
                  <div className="p-6 flex-1 overflow-y-auto">
                      <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-xl mb-6">
                          <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5" size={24} />
                          <div>
                              <h3 className="font-bold text-amber-800 dark:text-amber-300">UOM Conflicts Detected</h3>
                              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                  The following units in your local data do not have exact matches in Odoo. Please map them manually or create new units.
                              </p>
                          </div>
                      </div>
                      
                      <div className="space-y-3">
                          {state.uomConflicts.map((c, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-700/30 rounded-xl border border-gray-100 dark:border-zinc-700">
                                  <div className="flex items-center gap-4 flex-1">
                                      <div className="min-w-[120px]">
                                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Local Unit</span>
                                          <span className="text-lg font-bold text-gray-900 dark:text-white">{c.localUom}</span>
                                      </div>
                                      <ArrowRight size={20} className="text-gray-400" />
                                      <div className="flex-1 max-w-sm">
                                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Map to Odoo Unit</label>
                                          <select
                                              value={c.resolvedOdooId || ''}
                                              onChange={(e) => resolveConflict(c.localUom, Number(e.target.value))}
                                              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                          >
                                              <option value="" disabled>Select a unit...</option>
                                              {odooUoms.map(u => (
                                                  <option key={u.id} value={u.id}>{u.name}</option>
                                              ))}
                                          </select>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 border-l border-gray-200 dark:border-zinc-700 pl-4 ml-4">
                                      <span className="text-xs text-gray-400 font-medium mr-2">OR</span>
                                      <button 
                                        onClick={() => handleCreateUom(c.localUom)}
                                        disabled={!!c.resolvedOdooId}
                                        className="flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={`Create '${c.localUom}' in Odoo`}
                                      >
                                          {c.resolvedOdooId ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                                          <span>Create New</span>
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-4 border-t border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 flex justify-end">
                      <button 
                        onClick={finishResolution}
                        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-600/20 transition-all"
                      >
                          Confirm Mappings
                      </button>
                  </div>
              </div>
          )}

          {/* Phase 0/2/3: Dashboard */}
          {state.phase !== 'RESOLVING' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                  
                  {/* Left: Controls & Progress */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                       {/* Progress Card */}
                       <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
                           <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Overall Progress</h3>
                           
                           <div className="flex items-end gap-3 mb-2">
                               <span className="text-4xl font-extrabold text-primary-600 dark:text-primary-400 leading-none">
                                   {state.progress}%
                               </span>
                               <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                   Task {state.currentTaskIndex} of {state.tasks.length || '?'}
                               </span>
                           </div>
                           
                           <div className="w-full bg-gray-100 dark:bg-zinc-700 rounded-full h-3 mb-4 overflow-hidden">
                               <div 
                                   className="bg-primary-600 h-3 rounded-full transition-all duration-300 ease-out" 
                                   style={{ width: `${state.progress}%` }}
                               ></div>
                           </div>
                           
                           <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 font-mono">
                               <span>Start</span>
                               <span>Finish</span>
                           </div>
                       </div>

                       {/* Action Center */}
                       <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700 flex-1 flex flex-col">
                           <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">Action Center</h3>
                           
                           <div className="flex-1 flex flex-col items-center justify-center text-center">
                               {state.phase === 'IDLE' && (
                                   state.tasks.length === 0 ? (
                                        <div className="animate-in fade-in zoom-in-95 duration-300">
                                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Search size={32} />
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Ready to Analyze</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                                We found {demoProducts.length} local products ready for migration.
                                            </p>
                                            <button 
                                                onClick={runAnalysis}
                                                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-600/20"
                                            >
                                                Start Analysis
                                            </button>
                                        </div>
                                   ) : (
                                        <div className="animate-in fade-in zoom-in-95 duration-300 w-full">
                                            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <FileText size={32} />
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Plan Ready</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                                Generated {state.tasks.length} migration tasks.
                                            </p>
                                            <button 
                                                onClick={startMigration}
                                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                                            >
                                                <PlayCircle size={20} /> Execute Migration
                                            </button>
                                        </div>
                                   )
                               )}

                               {state.phase === 'MIGRATING' && (
                                   <div className="animate-in fade-in zoom-in-95 duration-300">
                                       <Loader2 size={64} className="text-primary-600 animate-spin mx-auto mb-6" />
                                       <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Migrating...</h4>
                                       <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                                           Please do not close this window.
                                       </p>
                                       <button 
                                            onClick={pauseMigration}
                                            className="px-6 py-2 border border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl font-bold transition-colors flex items-center gap-2 mx-auto"
                                       >
                                           <PauseCircle size={18} /> Pause
                                       </button>
                                   </div>
                               )}

                               {state.phase === 'PAUSED' && (
                                   <div className="animate-in fade-in zoom-in-95 duration-300 w-full">
                                       <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-4 mb-6 text-left">
                                            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 mb-1">
                                                <AlertTriangle size={18} /> Migration Paused
                                            </div>
                                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                                Process stopped. Check logs for details. You can resume from where you left off.
                                            </p>
                                       </div>
                                       <button 
                                            onClick={startMigration}
                                            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2"
                                       >
                                           <Play size={20} /> Resume
                                       </button>
                                   </div>
                               )}
                               
                               {state.phase === 'DONE' && (
                                   <div className="animate-in fade-in zoom-in-95 duration-300">
                                       <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                           <CheckCircle2 size={40} strokeWidth={3} />
                                       </div>
                                       <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Success!</h4>
                                       <p className="text-gray-500 dark:text-gray-400">All operations completed successfully.</p>
                                   </div>
                               )}
                           </div>
                       </div>
                  </div>

                  {/* Right: Console Logs */}
                  <div className="lg:col-span-7 h-full min-h-[400px]">
                      <div className="bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 h-full flex flex-col overflow-hidden font-mono text-sm">
                          <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                  <div className={`w-2.5 h-2.5 rounded-full ${state.phase === 'MIGRATING' ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`}></div>
                                  <span className="text-zinc-400 font-bold text-xs uppercase tracking-wider">Console Output</span>
                              </div>
                              <span className="text-zinc-600 text-xs">{state.logs.length} events</span>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                              {state.logs.length === 0 && (
                                  <div className="text-zinc-600 italic text-center mt-10">Waiting for logs...</div>
                              )}
                              {state.logs.map((log, i) => (
                                  <div key={i} className="flex gap-3 text-xs leading-relaxed group hover:bg-white/5 p-0.5 rounded">
                                      <span className="text-zinc-500 shrink-0 select-none">
                                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                                      </span>
                                      <div className="break-all">
                                          <span className={`
                                              ${log.level === 'error' ? 'text-red-400 font-bold' : ''}
                                              ${log.level === 'warn' ? 'text-amber-400 font-bold' : ''}
                                              ${log.level === 'success' ? 'text-green-400 font-bold' : ''}
                                              ${log.level === 'info' ? 'text-zinc-300' : ''}
                                          `}>
                                              {log.message}
                                          </span>
                                          {log.details && (
                                              <div className="mt-1 pl-2 border-l-2 border-zinc-700 text-zinc-500 overflow-x-auto">
                                                  <pre className="text-[10px]">{JSON.stringify(log.details, null, 2)}</pre>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              ))}
                              <div ref={logEndRef} />
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
