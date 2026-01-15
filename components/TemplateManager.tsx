import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { ParsedProduct, ActiveTab } from '../types';
import { 
    Layers, Edit2, CheckSquare, Square, Search, Barcode, Package, Trash2, Merge, Download, 
    Tag, Settings2, DollarSign, Ruler, ExternalLink, X 
} from 'lucide-react';
import { 
    Box, Typography, TextField, Button, IconButton, Card, CardContent, CardActions, 
    Chip, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableHead, 
    TableRow, TableCell, TableBody, InputAdornment, MenuItem, Select, FormControl, 
    InputLabel, Tooltip, Divider, useTheme, alpha 
} from '@mui/material';

interface Props {
  products: ParsedProduct[];
  onUpdateTemplate: (oldName: string, field: keyof ParsedProduct, value: any) => void;
  onNavigate: (tab: ActiveTab, query: string) => void;
  onDeleteTemplates: (names: string[]) => void;
  onMergeTemplates: (targetName: string, sourceNames: string[]) => void;
  externalSearchTerm?: string;
}

export const TemplateManager: React.FC<Props> = ({ products, onUpdateTemplate, onNavigate, onDeleteTemplates, onMergeTemplates, externalSearchTerm }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string, uom: string, type: string, tracking: string }>({ name: '', uom: '', type: '', tracking: 'none' });
  
  // State for Variants Dialog
  const [viewingVariantsFor, setViewingVariantsFor] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    if (externalSearchTerm !== undefined) {
      setSearchTerm(externalSearchTerm);
    }
  }, [externalSearchTerm]);

  const templates = useMemo(() => {
    const map = new Map<string, {
      name: string,
      uom: string,
      type: string,
      tracking: string,
      variants: ParsedProduct[],
      minPrice: number,
      maxPrice: number,
      commonCode: string,
      usedAttributes: Set<string>
    }>();

    products.forEach(p => {
      if (!map.has(p.templateName)) {
        map.set(p.templateName, {
          name: p.templateName,
          uom: p.uom,
          type: p.detailedType,
          tracking: p.tracking || 'none',
          variants: [],
          minPrice: p.price || 0,
          maxPrice: p.price || 0,
          commonCode: '',
          usedAttributes: new Set()
        });
      }
      const tmpl = map.get(p.templateName)!;
      tmpl.variants.push(p);
      
      const price = p.price || 0;
      if (price < tmpl.minPrice) tmpl.minPrice = price;
      if (price > tmpl.maxPrice) tmpl.maxPrice = price;

      p.attributes.forEach(attr => tmpl.usedAttributes.add(attr.name));
    });

    map.forEach(tmpl => {
        if (tmpl.variants.length > 0) {
            const firstCode = tmpl.variants[0].defaultCode;
            const parts = firstCode.split('-');
            tmpl.commonCode = parts.length > 1 ? parts[0] : firstCode.substring(0, 4); 
        }
    });

    return Array.from(map.values())
        .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm]);

  // Derived state for the modal
  const activeTemplateVariants = useMemo(() => {
      if (!viewingVariantsFor) return [];
      return templates.find(t => t.name === viewingVariantsFor)?.variants || [];
  }, [viewingVariantsFor, templates]);

  // --- Actions ---

  const toggleSelect = (name: string) => {
    const newSet = new Set(selectedTemplates);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelectedTemplates(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedTemplates.size === templates.length) setSelectedTemplates(new Set());
    else setSelectedTemplates(new Set(templates.map(t => t.name)));
  };

  const startEdit = (tmpl: any) => {
    setEditingId(tmpl.name);
    setEditForm({ name: tmpl.name, uom: tmpl.uom, type: tmpl.type, tracking: tmpl.tracking });
  };

  const saveEdit = (oldName: string) => {
    if (editForm.name.trim() !== oldName) {
      onUpdateTemplate(oldName, 'templateName', editForm.name.trim());
    }
    if (editForm.uom !== templates.find(t => t.name === oldName)?.uom) {
        onUpdateTemplate(oldName, 'uom', editForm.uom);
    }
    if (editForm.type !== templates.find(t => t.name === oldName)?.type) {
        onUpdateTemplate(oldName, 'detailedType', editForm.type);
    }
    if (editForm.tracking !== templates.find(t => t.name === oldName)?.tracking) {
        onUpdateTemplate(oldName, 'tracking', editForm.tracking);
    }
    setEditingId(null);
  };

  const handleDeleteSelected = () => {
    if (confirm(`Delete ${selectedTemplates.size} templates and ALL their variants?`)) {
        onDeleteTemplates(Array.from(selectedTemplates));
        setSelectedTemplates(new Set());
    }
  };

  const handleMergeSelected = () => {
      const selected = Array.from(selectedTemplates);
      if (selected.length < 2) return;
      
      const target = selected[0];
      const sources = selected.slice(1);

      if (confirm(`Merge ${sources.length} templates into "${target}"?`)) {
          onMergeTemplates(target, sources);
          setSelectedTemplates(new Set());
      }
  };

  const handleExportTemplates = () => {
      const dataToExport = templates.map(t => ({
          Name: t.name,
          InternalReference: t.commonCode,
          Type: t.type,
          UOM: t.uom,
          Tracking: t.tracking,
          VariantCount: t.variants.length,
          PriceRange: `${t.minPrice} - ${t.maxPrice}`
      }));
      const csv = Papa.unparse(dataToExport);
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `odoo_templates_list.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const formatPrice = (val: number) => new Intl.NumberFormat('en-US').format(val);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper', position: 'relative' }}>
      
      {/* Variants Modal Dialog */}
      <Dialog 
        open={!!viewingVariantsFor} 
        onClose={() => setViewingVariantsFor(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box display="flex" alignItems="center" gap={2}>
                <Box sx={{ p: 1, bgcolor: 'primary.50', borderRadius: 1, color: 'primary.main' }}><Layers size={24} /></Box>
                <Box>
                    <Typography variant="h6" fontWeight="bold">{viewingVariantsFor}</Typography>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="caption" color="text.secondary">
                            Ref: <Box component="span" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 }}>{activeTemplateVariants[0]?.defaultCode.split('-')[0] || 'N/A'}</Box>
                        </Typography>
                        <Chip label={`${activeTemplateVariants.length} Variants`} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                    </Box>
                </Box>
            </Box>
            <IconButton onClick={() => setViewingVariantsFor(null)}><X /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Product Variant</TableCell>
                        <TableCell>Internal Ref</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell>Barcode</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {activeTemplateVariants.map((variant) => (
                        <TableRow key={variant.id} hover>
                            <TableCell>
                                <Typography variant="subtitle2" fontWeight="bold">{variant.templateName}</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {variant.attributes.map((attr, idx) => (
                                        <Chip key={idx} label={`${attr.name}: ${attr.value}`} size="small" sx={{ fontSize: 10, height: 20 }} />
                                    ))}
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Typography variant="caption" fontFamily="monospace" sx={{ bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1 }}>
                                    {variant.defaultCode || '-'}
                                </Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body2" fontWeight="bold">
                                    {formatPrice(variant.price || 0)} <Typography component="span" variant="caption" color="text.secondary">{variant.currency}</Typography>
                                </Typography>
                                {variant.standard_price && variant.standard_price > 0 && (
                                    <Typography variant="caption" display="block" color="text.secondary">Cost: {formatPrice(variant.standard_price)}</Typography>
                                )}
                            </TableCell>
                            <TableCell>
                                <Box display="flex" alignItems="center" gap={1} color="text.secondary">
                                    <Barcode size={16} />
                                    <Typography variant="caption" fontFamily="monospace">{variant.barcode || '-'}</Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
            <Button 
                onClick={() => { setViewingVariantsFor(null); onNavigate(ActiveTab.VARIANTS, viewingVariantsFor || ''); }}
                endIcon={<ExternalLink size={16} />}
                variant="outlined"
            >
                Manage in Products
            </Button>
        </DialogActions>
      </Dialog>

      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 10 }}>
         <Box display="flex" alignItems="center" gap={2} flex={1}>
            <Tooltip title="Select All">
                <IconButton onClick={toggleSelectAll}>
                    {selectedTemplates.size > 0 && selectedTemplates.size === templates.length ? <CheckSquare size={20} color={theme.palette.primary.main} /> : <Square size={20} />}
                </IconButton>
            </Tooltip>
            
            <TextField 
                placeholder="بحث في القوالب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                    startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment>,
                }}
                sx={{ maxWidth: 350, bgcolor: 'background.paper' }}
            />
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
            {selectedTemplates.size > 0 ? (
                <>
                    <Chip label={`${selectedTemplates.size} selected`} color="primary" size="small" />
                    {selectedTemplates.size > 1 && (
                        <Button 
                            onClick={handleMergeSelected}
                            startIcon={<Merge size={16} />}
                            variant="outlined" color="info" size="small"
                        >
                            Merge
                        </Button>
                    )}
                    <Button 
                        onClick={handleDeleteSelected}
                        startIcon={<Trash2 size={16} />}
                        variant="contained" color="error" size="small"
                    >
                        Delete
                    </Button>
                </>
            ) : (
                <Button 
                    onClick={handleExportTemplates}
                    startIcon={<Download size={16} />}
                    color="inherit"
                >
                    Export List
                </Button>
            )}
        </Box>
      </Box>

      {/* Content Grid */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'background.default' }}>
        {templates.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'text.disabled' }}>
                 <Layers size={64} style={{ opacity: 0.2, marginBottom: 16 }} />
                 <Typography>لا توجد قوالب للعرض</Typography>
            </Box>
        ) : (
            <Grid container spacing={2}>
                {templates.map((tmpl) => (
                    <Grid item xs={12} md={6} xl={4} key={tmpl.name}>
                        <Card 
                            variant="outlined" 
                            sx={{ 
                                height: '100%', display: 'flex', flexDirection: 'column', 
                                borderColor: selectedTemplates.has(tmpl.name) ? 'primary.main' : 'divider',
                                borderWidth: selectedTemplates.has(tmpl.name) ? 2 : 1,
                                position: 'relative',
                                transition: 'all 0.2s',
                                '&:hover': { boxShadow: 3, borderColor: selectedTemplates.has(tmpl.name) ? 'primary.main' : 'primary.light' }
                            }}
                        >
                            {editingId === tmpl.name ? (
                                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                                    <TextField label="Template Name" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} fullWidth size="small" />
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Type</InputLabel>
                                                <Select label="Type" value={editForm.type} onChange={(e) => setEditForm({...editForm, type: e.target.value})}>
                                                    <MenuItem value="product">Storable</MenuItem>
                                                    <MenuItem value="service">Service</MenuItem>
                                                    <MenuItem value="consu">Consumable</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Tracking</InputLabel>
                                                <Select label="Tracking" value={editForm.tracking} onChange={(e) => setEditForm({...editForm, tracking: e.target.value})}>
                                                    <MenuItem value="none">None</MenuItem>
                                                    <MenuItem value="lot">By Lots</MenuItem>
                                                    <MenuItem value="serial">By Serial</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    </Grid>
                                    <TextField label="UOM" value={editForm.uom} onChange={(e) => setEditForm({...editForm, uom: e.target.value})} fullWidth size="small" />
                                    
                                    <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                        <Button onClick={() => setEditingId(null)} color="inherit">Cancel</Button>
                                        <Button onClick={() => saveEdit(tmpl.name)} variant="contained" color="primary">Save</Button>
                                    </Box>
                                </Box>
                            ) : (
                                <>
                                    <CardContent sx={{ pb: 1, flex: 1 }}>
                                        <Box display="flex" alignItems="flex-start" gap={1} mb={1}>
                                            <Box onClick={() => toggleSelect(tmpl.name)} sx={{ cursor: 'pointer', mt: 0.5 }}>
                                                {selectedTemplates.has(tmpl.name) ? <CheckSquare size={20} color={theme.palette.primary.main} /> : <Square size={20} color={theme.palette.text.disabled} />}
                                            </Box>
                                            <Box flex={1}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                    <Chip 
                                                        label={tmpl.commonCode || 'NO-REF'} 
                                                        size="small" 
                                                        sx={{ borderRadius: 1, height: 20, fontSize: 10, bgcolor: 'action.hover', fontFamily: 'monospace' }} 
                                                    />
                                                    <Chip 
                                                        label={tmpl.type === 'service' ? 'Service' : 'Storable'} 
                                                        size="small"
                                                        color={tmpl.type === 'service' ? 'info' : 'success'}
                                                        variant="outlined"
                                                        sx={{ height: 20, fontSize: 10 }}
                                                    />
                                                </Box>
                                                <Typography variant="subtitle2" fontWeight="bold" lineHeight={1.3}>
                                                    {tmpl.name}
                                                </Typography>
                                            </Box>
                                            <IconButton size="small" onClick={() => startEdit(tmpl)}>
                                                <Edit2 size={16} />
                                            </IconButton>
                                        </Box>

                                        <Divider sx={{ my: 1.5 }} />

                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                                                    <DollarSign size={12} /> Price Range
                                                </Typography>
                                                <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
                                                    {tmpl.minPrice === tmpl.maxPrice 
                                                        ? formatPrice(tmpl.minPrice) 
                                                        : `${formatPrice(tmpl.minPrice)} - ${formatPrice(tmpl.maxPrice)}`}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6} sx={{ textAlign: 'right' }}>
                                                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                                                    <Ruler size={12} /> UOM
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {tmpl.uom}
                                                </Typography>
                                            </Grid>
                                        </Grid>

                                        <Box mt={2}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                                                <Typography variant="caption" color="text.secondary">Attributes ({tmpl.usedAttributes.size})</Typography>
                                                <Button 
                                                    size="small" 
                                                    onClick={() => onNavigate(ActiveTab.ATTRIBUTES, Array.from(tmpl.usedAttributes)[0] || '')}
                                                    sx={{ fontSize: 10, minWidth: 0, p: 0 }}
                                                    startIcon={<Settings2 size={10} />}
                                                >
                                                    Configure
                                                </Button>
                                            </Box>
                                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                                                {Array.from(tmpl.usedAttributes).slice(0, 4).map(attr => (
                                                    <Chip key={attr} label={attr} size="small" sx={{ fontSize: 10, height: 20, bgcolor: 'action.hover' }} icon={<Tag size={10} />} />
                                                ))}
                                                {tmpl.usedAttributes.size > 4 && <Chip label={`+${tmpl.usedAttributes.size - 4}`} size="small" sx={{ fontSize: 10, height: 20 }} />}
                                                {tmpl.usedAttributes.size === 0 && <Typography variant="caption" color="text.disabled">No attributes</Typography>}
                                            </Box>
                                        </Box>
                                    </CardContent>

                                    <CardActions sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), justifyContent: 'space-between', px: 2, py: 1 }}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            {tmpl.tracking !== 'none' && (
                                                <Tooltip title={`Tracking: ${tmpl.tracking}`}>
                                                    <Chip 
                                                        icon={<Barcode size={12} />} 
                                                        label={tmpl.tracking} 
                                                        size="small" 
                                                        color="warning" 
                                                        variant="outlined" 
                                                        sx={{ height: 20, fontSize: 10 }} 
                                                    />
                                                </Tooltip>
                                            )}
                                        </Box>
                                        <Button 
                                            size="small" 
                                            onClick={() => setViewingVariantsFor(tmpl.name)}
                                            startIcon={<Package size={16} />}
                                            sx={{ fontWeight: 'bold' }}
                                        >
                                            {tmpl.variants.length} Variants
                                        </Button>
                                    </CardActions>
                                </>
                            )}
                        </Card>
                    </Grid>
                ))}
            </Grid>
        )}
      </Box>
    </Box>
  );
};