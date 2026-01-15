
import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { 
    ParsedProduct, OdooAttribute, OdooAttributeValue, OdooCurrency, OdooPricelist, 
    MigrationState, MigrationPhase, MigrationTask, MigrationLog, UomConflict 
} from '../types';
import { 
    createOdooAttribute, createOdooAttributeValue, createOdooTemplate, 
    fetchOdooAttributes, fetchOdooAttributeValues, waitForProductVariants, 
    updateOdooProduct, fetchOdooCurrencies, fetchOdooPricelists, createOdooPricelist, createOdooPricelistItem,
    fetchOdooUoms, createOdooUom, delay
} from '../services/odooService';
import { getFullSettings } from '../services/settingsService';
import { 
    ArrowRight, RefreshCw, CheckCircle2, AlertTriangle, Play, Tags, Layers, 
    Loader2, Database, AlertCircle, Save, Download, PauseCircle, PlayCircle, 
    Trash2, Search, Activity, Plus
} from 'lucide-react';
import { 
    Box, Paper, Typography, Button, Stepper, Step, StepLabel, LinearProgress, 
    List, ListItem, ListItemText, ListItemIcon, 
    Chip, Divider, Alert, AlertTitle, Grid, Card, CardContent, useTheme, IconButton, 
    Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel, Tooltip
} from '@mui/material';

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
  const theme = useTheme();

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
                  // Update local cache so values can find it
                  setOdooAttributes(prev => [...prev, { id, name: task.data.name, display_type: 'select' }]);
              } 
              else if (task.type === 'value') {
                  // Find Parent Attribute ID (might be newly created)
                  // We must fetch latest attributes state or search in what we just pushed
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

              // Small delay to allow UI to breathe and not hammer Odoo
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
      const templatePayload = {
          name: tmplName,
          detailed_type: 'product',
          uom_id: uomId,
          uom_po_id: uomId,
          list_price: baseProduct.price || 0,
          standard_price: baseProduct.standard_price || 0,
          attribute_line_ids: attribute_line_ids,
          tracking: baseProduct.tracking,
          sale_ok: true,
          purchase_ok: true,
          taxes_id: [[6, 0, []]],
          categ_id: 1
      };

      const tmplId = await createOdooTemplate(templatePayload);

      // 4. Wait for Variants & Update Codes
      if (variants.length > 0) {
           const generatedVariants = await waitForProductVariants(tmplId, variants.length);
           for (const genVar of generatedVariants) {
                // Match Logic: Display Name contains all attr values
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

  // --- Rendering ---

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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper sx={{ p: 2, px: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center" gap={2}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.main', color: 'white' }}>
                  <Activity size={24} />
              </Box>
              <Box>
                  <Typography variant="h6" fontWeight="bold">Migration Manager</Typography>
                  <Typography variant="caption" color="text.secondary">
                      Session ID: <span style={{fontFamily: 'monospace'}}>{state.id.split('-')[0]}</span> • Status: <b>{getPhaseLabel(state.phase)}</b>
                  </Typography>
              </Box>
          </Box>
          <Box>
              <Button startIcon={<Trash2 size={16}/>} color="error" onClick={resetMigration} sx={{ mr: 1 }}>
                  Reset
              </Button>
              <Button startIcon={<Download size={16}/>} onClick={downloadLogs} variant="outlined" size="small">
                  Logs
              </Button>
          </Box>
      </Paper>

      {/* Content Area */}
      <Box sx={{ flex: 1, p: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Phase 1: UOM Conflict Resolution */}
          {state.phase === 'RESOLVING' && (
              <Card variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: 1, overflowY: 'auto' }}>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                          <AlertTitle>UOM Conflicts Detected</AlertTitle>
                          The following units in your local data do not have exact matches in Odoo. 
                          Please map them manually to avoid data errors.
                      </Alert>
                      <List>
                          {state.uomConflicts.map((c, idx) => (
                              <ListItem key={idx} divider>
                                  <Grid container alignItems="center" spacing={2}>
                                      <Grid item xs={4}>
                                          <Typography variant="subtitle2">Local: <b>{c.localUom}</b></Typography>
                                      </Grid>
                                      <Grid item xs={1} textAlign="center"><ArrowRight size={16} /></Grid>
                                      <Grid item xs={7} display="flex" gap={1}>
                                          <FormControl fullWidth size="small">
                                              <InputLabel>Map to Odoo UOM</InputLabel>
                                              <Select
                                                  value={c.resolvedOdooId || ''}
                                                  label="Map to Odoo UOM"
                                                  onChange={(e) => resolveConflict(c.localUom, Number(e.target.value))}
                                              >
                                                  {odooUoms.map(u => (
                                                      <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                                  ))}
                                              </Select>
                                          </FormControl>
                                          <Tooltip title={`Create '${c.localUom}' in Odoo`}>
                                              <IconButton 
                                                onClick={() => handleCreateUom(c.localUom)} 
                                                color="primary" 
                                                sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
                                                disabled={!!c.resolvedOdooId}
                                              >
                                                  {c.resolvedOdooId ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                                              </IconButton>
                                          </Tooltip>
                                      </Grid>
                                  </Grid>
                              </ListItem>
                          ))}
                      </List>
                  </CardContent>
                  <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="contained" onClick={finishResolution}>Confirm Mappings</Button>
                  </Box>
              </Card>
          )}

          {/* Phase 0/2/3: Dashboard */}
          {state.phase !== 'RESOLVING' && (
              <Grid container spacing={3} sx={{ height: '100%' }}>
                  {/* Left: Controls & Progress */}
                  <Grid item xs={12} md={5} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                       <Card variant="outlined">
                           <CardContent>
                               <Typography variant="subtitle2" color="text.secondary" gutterBottom>OVERALL PROGRESS</Typography>
                               <Box display="flex" alignItems="center" gap={2} mb={1}>
                                   <LinearProgress variant="determinate" value={state.progress} sx={{ flex: 1, height: 10, borderRadius: 5 }} />
                                   <Typography variant="h6" fontWeight="bold">{state.progress}%</Typography>
                               </Box>
                               <Typography variant="caption" color="text.secondary">
                                   Task {state.currentTaskIndex} / {state.tasks.length || '?'}
                               </Typography>
                           </CardContent>
                       </Card>

                       <Card variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                           <CardContent sx={{ flex: 1 }}>
                               <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Action Center</Typography>
                               
                               {state.phase === 'IDLE' && (
                                   state.tasks.length === 0 ? (
                                        <Box mt={2}>
                                            <Alert severity="info" sx={{ mb: 2 }}>Ready to analyze {demoProducts.length} local products.</Alert>
                                            <Button fullWidth variant="contained" size="large" startIcon={<Search />} onClick={runAnalysis}>
                                                Start Analysis
                                            </Button>
                                        </Box>
                                   ) : (
                                        <Box mt={2}>
                                            <Alert severity="success" sx={{ mb: 2 }}>Analysis Complete. {state.tasks.length} tasks planned.</Alert>
                                            <Button fullWidth variant="contained" size="large" startIcon={<PlayCircle />} onClick={startMigration}>
                                                Execute Migration
                                            </Button>
                                        </Box>
                                   )
                               )}

                               {state.phase === 'MIGRATING' && (
                                   <Box mt={2} textAlign="center">
                                       <Loader2 size={48} className="animate-spin text-primary" style={{ marginBottom: 16 }} />
                                       <Typography variant="h6">Migrating...</Typography>
                                       <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                           Please do not close this window.
                                       </Typography>
                                       <Button variant="outlined" color="warning" startIcon={<PauseCircle />} onClick={pauseMigration}>
                                           Pause Execution
                                       </Button>
                                   </Box>
                               )}

                               {state.phase === 'PAUSED' && (
                                   <Box mt={2}>
                                       <Alert severity="warning" sx={{ mb: 2 }}>
                                            <AlertTitle>Migration Paused</AlertTitle>
                                            Process stopped. Check logs for details. You can resume from where you left off.
                                       </Alert>
                                       <Button fullWidth variant="contained" color="primary" startIcon={<Play />} onClick={startMigration}>
                                           Resume
                                       </Button>
                                   </Box>
                               )}
                               
                               {state.phase === 'DONE' && (
                                   <Box mt={2} textAlign="center">
                                       <CheckCircle2 size={64} color={theme.palette.success.main} style={{ marginBottom: 16 }} />
                                       <Typography variant="h5" fontWeight="bold">Success!</Typography>
                                       <Typography color="text.secondary">All operations completed.</Typography>
                                   </Box>
                               )}
                           </CardContent>
                       </Card>
                  </Grid>

                  {/* Right: Console Logs */}
                  <Grid item xs={12} md={7} sx={{ height: '100%' }}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            bgcolor: '#1e1e1e',
                            color: '#d4d4d4',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem'
                        }}
                      >
                          <Box sx={{ p: 1, borderBottom: 1, borderColor: '#333', display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: state.phase === 'MIGRATING' ? '#22c55e' : '#666' }} />
                              <Typography variant="caption" fontWeight="bold">CONSOLE OUTPUT</Typography>
                          </Box>
                          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                              {state.logs.length === 0 && <Typography sx={{ opacity: 0.5 }}>Waiting for logs...</Typography>}
                              {state.logs.map((log, i) => (
                                  <div key={i} style={{ marginBottom: 4, display: 'flex', gap: 8 }}>
                                      <span style={{ color: '#569cd6' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                      <span style={{ 
                                          color: log.level === 'error' ? '#f87171' : 
                                                 log.level === 'warn' ? '#fbbf24' : 
                                                 log.level === 'success' ? '#4ade80' : 'inherit' 
                                      }}>
                                          {log.message}
                                          {log.details && (
                                              <div style={{ paddingLeft: 20, opacity: 0.7, fontSize: '0.8em' }}>
                                                  {JSON.stringify(log.details)}
                                              </div>
                                          )}
                                      </span>
                                  </div>
                              ))}
                              <div ref={logEndRef} />
                          </Box>
                      </Paper>
                  </Grid>
              </Grid>
          )}
      </Box>
    </Box>
  );
};
