import React, { useState } from 'react';
import { OdooConfig, ParsedProduct, SystemHealthReport, PreCheckResult, SyncCapabilities } from '../types';
import { authenticateOdoo, fetchOdooProducts, fetchOdooCurrencies, checkSystemHealth, runSyncPreCheck } from '../services/odooService';
import { saveSettings, getFullSettings } from '../services/settingsService';
import { 
    Server, Wifi, Database, Lock, User, Globe, ArrowRight, ShieldCheck, 
    Zap, AlertTriangle, Activity, CheckCircle2, XCircle, ShieldAlert 
} from 'lucide-react';
import { 
    Box, Paper, Typography, TextField, Button, CircularProgress, InputAdornment, 
    Alert, AlertTitle, Grid, Card, CardActionArea, FormControlLabel, Switch, 
    Tooltip, Collapse, useTheme, Fade, Chip, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, 
    DialogActions, Stack
} from '@mui/material';

interface Props {
  onDataFetched: (products: ParsedProduct[], capabilities: SyncCapabilities) => void;
}

// Error Messages Dictionary (Arabic)
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

  const theme = useTheme();

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
    <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%', 
        p: 3,
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.action.hover} 100%)`
    }}>
      {/* System Health Dialog */}
      <Dialog 
        open={showHealthModal} 
        onClose={() => setShowHealthModal(false)}
        maxWidth="md"
        fullWidth
      >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
             <Activity size={24} color={!preCheckResult?.canSync ? theme.palette.error.main : theme.palette.primary.main} />
             System Health & Compliance Report
             {healthReport?.odoo_version && <Chip label={`v${healthReport.odoo_version}`} size="small" sx={{ ml: 'auto' }} />}
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
              {preCheckResult && (
                  <Box>
                      {/* Critical Issues */}
                      {preCheckResult.criticalIssues.length > 0 && (
                          <Box p={2}>
                              <Alert severity="error" variant="filled">
                                  <AlertTitle>Critical Configuration Issues</AlertTitle>
                                  Synchronization cannot proceed until these are fixed.
                              </Alert>
                              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                                  <Table size="small">
                                      <TableHead>
                                          <TableRow>
                                              <TableCell>Model</TableCell>
                                              <TableCell>Issue</TableCell>
                                              <TableCell>Solution</TableCell>
                                          </TableRow>
                                      </TableHead>
                                      <TableBody>
                                          {preCheckResult.criticalIssues.map((issue, idx) => (
                                              <TableRow key={idx}>
                                                  <TableCell sx={{ fontFamily: 'monospace' }}>{issue.model}</TableCell>
                                                  <TableCell>{issue.message_en}</TableCell>
                                                  <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>{issue.action}</TableCell>
                                              </TableRow>
                                          ))}
                                      </TableBody>
                                  </Table>
                              </TableContainer>
                          </Box>
                      )}

                      {/* Warnings */}
                      {preCheckResult.warnings.length > 0 && (
                          <Box p={2} pt={preCheckResult.criticalIssues.length > 0 ? 0 : 2}>
                              <Alert severity="warning">
                                  <AlertTitle>Capabilities Limitation</AlertTitle>
                                  The connection is successful, but some features will be restricted.
                              </Alert>
                              <Box mt={1}>
                                  {preCheckResult.warnings.map((w, i) => (
                                      <Typography key={i} variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                          <AlertTriangle size={14} /> {w.message_en} ({w.impact})
                                      </Typography>
                                  ))}
                              </Box>
                          </Box>
                      )}

                      {/* Capabilities Summary */}
                      <Box p={2} bgcolor="action.hover" borderTop={1} borderColor="divider">
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Authenticated Capabilities:</Typography>
                          <Stack direction="row" spacing={1}>
                              <Chip 
                                  icon={preCheckResult.capabilities.canRead ? <CheckCircle2 size={16} /> : <XCircle size={16} />} 
                                  label="READ" 
                                  color={preCheckResult.capabilities.canRead ? 'success' : 'error'} 
                                  variant="outlined" 
                              />
                              <Chip 
                                  icon={preCheckResult.capabilities.canWrite ? <CheckCircle2 size={16} /> : <XCircle size={16} />} 
                                  label="WRITE" 
                                  color={preCheckResult.capabilities.canWrite ? 'success' : 'error'} 
                                  variant="outlined" 
                              />
                              <Chip 
                                  icon={preCheckResult.capabilities.canCreate ? <CheckCircle2 size={16} /> : <XCircle size={16} />} 
                                  label="CREATE" 
                                  color={preCheckResult.capabilities.canCreate ? 'success' : 'error'} 
                                  variant="outlined" 
                              />
                          </Stack>
                      </Box>
                  </Box>
              )}
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Button onClick={() => setShowHealthModal(false)} color="inherit">Close</Button>
              {preCheckResult?.canSync && (
                  <Button 
                    variant="contained" 
                    onClick={() => { setShowHealthModal(false); fetchOdooProducts().then((p) => onDataFetched(p, preCheckResult.capabilities)); }}
                    endIcon={<ArrowRight size={16} />}
                  >
                      Proceed Anyway
                  </Button>
              )}
          </DialogActions>
      </Dialog>

      <Paper 
        elevation={6} 
        sx={{ 
            width: '100%', 
            maxWidth: 1100, 
            borderRadius: 4, 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            minHeight: 600
        }}
      >
          {/* Left Side: Profiles & Branding */}
          <Box sx={{ 
              flex: { xs: 'none', md: 2 }, 
              bgcolor: 'primary.main', 
              color: 'primary.contrastText',
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
          }}>
              {/* Decor Circles */}
              <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)' }} />
              <Box sx={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />

              <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                          <Server size={24} color="white" />
                      </Box>
                      <Typography variant="h5" fontWeight="800">Odoo Connector</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 4 }}>
                      Select an environment to synchronize product data.
                  </Typography>

                  <Box display="flex" flexDirection="column" gap={2}>
                      {profiles.map((p, i) => (
                          <Card 
                            key={i} 
                            elevation={0}
                            sx={{ 
                                bgcolor: activeProfileIndex === i ? 'white' : 'rgba(255,255,255,0.1)', 
                                color: activeProfileIndex === i ? 'primary.main' : 'white',
                                borderRadius: 3,
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': { bgcolor: activeProfileIndex === i ? 'white' : 'rgba(255,255,255,0.2)' }
                            }}
                          >
                              <CardActionArea onClick={() => loadProfile(p)} sx={{ p: 2 }}>
                                  <Box display="flex" alignItems="center" justifyContent="space-between">
                                      <Box display="flex" alignItems="center" gap={2}>
                                          {i === 0 ? <ShieldCheck size={20} /> : <Zap size={20} />}
                                          <Box>
                                              <Typography variant="subtitle2" fontWeight="bold">{p.name}</Typography>
                                              <Typography variant="caption" sx={{ opacity: 0.7 }}>{p.db}</Typography>
                                          </Box>
                                      </Box>
                                      {activeProfileIndex === i && <ArrowRight size={18} />}
                                  </Box>
                              </CardActionArea>
                          </Card>
                      ))}
                  </Box>
              </Box>

              <Box sx={{ mt: 'auto', pt: 4, position: 'relative', zIndex: 1 }}>
                  <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', textAlign: 'center' }}>
                      Secure JSON-RPC Protocol • Odoo v18 Compatible
                  </Typography>
              </Box>
          </Box>

          {/* Right Side: Form */}
          <Box sx={{ 
              flex: { xs: 'none', md: 3 }, 
              p: { xs: 3, md: 5 },
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
          }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: 'text.primary' }}>
                  إعدادات الاتصال
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  أدخل بيانات الاتصال الخاصة بنظام أودو أو اختر ملف تعريف جاهز.
              </Typography>

              <Grid container spacing={2}>
                  <Grid item xs={12}>
                      <TextField
                          label="رابط الخادم (Server URL)"
                          placeholder="https://odoo.example.com"
                          value={config.url}
                          onChange={e => setConfig({...config, url: e.target.value})}
                          fullWidth
                          variant="outlined"
                          InputProps={{
                              startAdornment: <InputAdornment position="start"><Globe size={18} /></InputAdornment>,
                          }}
                      />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                      <TextField
                          label="قاعدة البيانات (Database)"
                          value={config.db}
                          onChange={e => setConfig({...config, db: e.target.value})}
                          fullWidth
                          variant="outlined"
                          InputProps={{
                              startAdornment: <InputAdornment position="start"><Database size={18} /></InputAdornment>,
                          }}
                      />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                      <TextField
                          label="البريد الإلكتروني (Login)"
                          value={config.username}
                          onChange={e => setConfig({...config, username: e.target.value})}
                          fullWidth
                          variant="outlined"
                          InputProps={{
                              startAdornment: <InputAdornment position="start"><User size={18} /></InputAdornment>,
                          }}
                      />
                  </Grid>

                  <Grid item xs={12}>
                      <TextField
                          label="كلمة المرور / API Key"
                          type="password"
                          value={config.password || ''}
                          onChange={e => setConfig({...config, password: e.target.value})}
                          fullWidth
                          variant="outlined"
                          InputProps={{
                              startAdornment: <InputAdornment position="start"><Lock size={18} /></InputAdornment>,
                          }}
                      />
                  </Grid>

                  <Grid item xs={12}>
                     <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
                        <FormControlLabel
                            control={
                                <Switch 
                                    checked={config.enablePricelists || false} 
                                    onChange={e => setConfig({...config, enablePricelists: e.target.checked})} 
                                    color="warning"
                                />
                            }
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">تفعيل قوائم الأسعار (تجريبي)</Typography>
                                    <Tooltip title="هذه الميزة قد تسبب مشاكل في الأداء حالياً. قم بتفعيلها فقط إذا كنت بحاجة لمزامنة أسعار بعملات متعددة.">
                                        <AlertTriangle size={16} color={theme.palette.warning.main} />
                                    </Tooltip>
                                </Box>
                            }
                        />
                        <Collapse in={config.enablePricelists}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                سيقوم النظام بمحاولة إنشاء ومزامنة قوائم أسعار للعملات المتعددة (USD, SAR) أثناء عملية النقل.
                            </Typography>
                        </Collapse>
                     </Box>
                  </Grid>
              </Grid>

              <Box sx={{ mt: 4 }}>
                  <Button 
                      onClick={handleConnect}
                      disabled={isLoading}
                      variant="contained"
                      size="large"
                      fullWidth
                      sx={{ 
                          py: 1.5, 
                          borderRadius: 2, 
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          boxShadow: 2
                      }}
                      startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Wifi />}
                  >
                      {isLoading ? 'جاري التحقق...' : 'اتصال بقاعدة البيانات'}
                  </Button>
              </Box>

              <Fade in={status !== 'idle'}>
                  <Box sx={{ mt: 3 }}>
                      <Alert 
                          severity={status === 'success' ? 'success' : 'error'}
                          variant="outlined"
                          icon={false}
                          sx={{ border: 1, borderRadius: 2 }}
                          action={
                              (status === 'success' || preCheckResult) ? (
                                  <Button color="inherit" size="small" onClick={() => setShowHealthModal(true)}>
                                      Review Health
                                  </Button>
                              ) : undefined
                          }
                      >
                          <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {status === 'success' ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                              {status === 'success' ? 'تم الاتصال بنجاح' : 'فشل الاتصال'}
                          </AlertTitle>
                          {message}
                          {errorDetails && (
                              <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary', fontFamily: 'monospace' }}>
                                  {errorDetails}
                              </Typography>
                          )}
                      </Alert>
                  </Box>
              </Fade>
          </Box>
      </Paper>
    </Box>
  );
};