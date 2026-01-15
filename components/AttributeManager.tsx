
import React, { useState, useMemo, useEffect } from 'react';
import { ParsedProduct, GlobalAttributeConfig, AttributeCreationMode, AttributeDisplayType } from '../types';
import { Tags, Edit2, Check, Search, Settings, Palette, List, Type, MousePointerClick, Package, X, Barcode } from 'lucide-react';
import { Box, TextField, Typography, Button, IconButton, Select, MenuItem, Chip, Dialog, DialogTitle, DialogContent, Grid, Paper, InputAdornment, useTheme, Divider } from '@mui/material';

interface Props {
  products: ParsedProduct[];
  attributeConfigs: Map<string, GlobalAttributeConfig>;
  onUpdateAttributeName: (oldName: string, newName: string) => void;
  onUpdateAttributeValue: (attrName: string, oldValue: string, newValue: string) => void;
  onUpdateAttributeConfig: (attrName: string, config: GlobalAttributeConfig) => void;
  externalSearchTerm?: string;
}

export const AttributeManager: React.FC<Props> = ({ products, attributeConfigs, onUpdateAttributeName, onUpdateAttributeValue, onUpdateAttributeConfig, externalSearchTerm }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAttr, setEditingAttr] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<{ attr: string, val: string } | null>(null);
  const [tempName, setTempName] = useState('');
  
  // State for Value Inspection Modal
  const [inspectedValue, setInspectedValue] = useState<{ attr: string, val: string } | null>(null);
  const theme = useTheme();

  useEffect(() => {
    if (externalSearchTerm !== undefined) {
      setSearchTerm(externalSearchTerm);
    }
  }, [externalSearchTerm]);

  const attributesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    products.forEach(p => {
      p.attributes.forEach(a => {
        if (!map.has(a.name)) map.set(a.name, new Set());
        map.get(a.name)?.add(a.value);
      });
    });
    return map;
  }, [products]);

  const sortedAttributes = useMemo(() => {
    return Array.from(attributesMap.entries())
      .map(([name, valuesSet]) => ({
        name,
        values: Array.from(valuesSet).sort(),
        config: attributeConfigs.get(name) || { displayType: 'select', creationMode: 'always' } as GlobalAttributeConfig
      }))
      .filter(attr => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          attr.name.toLowerCase().includes(q) ||
          attr.values.some((v: string) => v.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [attributesMap, searchTerm, attributeConfigs]);

  // Derived state for the modal
  const associatedProducts = useMemo(() => {
      if (!inspectedValue) return [];
      return products.filter(p => 
          p.attributes.some(a => a.name === inspectedValue.attr && a.value === inspectedValue.val)
      );
  }, [inspectedValue, products]);

  const startEditAttr = (name: string) => {
    setEditingAttr(name);
    setTempName(name);
  };

  const saveAttr = () => {
    if (editingAttr && tempName.trim() && tempName !== editingAttr) {
      onUpdateAttributeName(editingAttr, tempName.trim());
    }
    setEditingAttr(null);
  };

  const startEditValue = (attr: string, val: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening modal
    setEditingValue({ attr, val });
    setTempName(val);
  };

  const saveValue = () => {
    if (editingValue && tempName.trim() && tempName !== editingValue.val) {
      onUpdateAttributeValue(editingValue.attr, editingValue.val, tempName.trim());
    }
    setEditingValue(null);
  };

  const handleValueClick = (attr: string, val: string) => {
      if (editingValue) return;
      setInspectedValue({ attr, val });
  };

  const formatPrice = (val: number) => new Intl.NumberFormat('en-US').format(val);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper', position: 'relative' }}>
       {/* Modal Overlay for Product Inspection */}
       <Dialog 
          open={!!inspectedValue} 
          onClose={() => setInspectedValue(null)}
          maxWidth="md"
          fullWidth
       >
           <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                   <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 2, color: 'primary.main', border: 1, borderColor: 'divider' }}>
                       <Tags size={24} />
                   </Box>
                   <Box>
                       <Typography variant="h6" fontWeight="bold">المنتجات المرتبطة</Typography>
                       {inspectedValue && (
                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                               <Typography variant="body2" color="text.secondary">{inspectedValue.attr}:</Typography>
                               <Chip label={inspectedValue.val} size="small" color="primary" variant="outlined" />
                           </Box>
                       )}
                   </Box>
               </Box>
               <IconButton onClick={() => setInspectedValue(null)}><X /></IconButton>
           </DialogTitle>
           
           <DialogContent sx={{ bgcolor: 'background.default', p: 3 }}>
               <Grid container spacing={2}>
                   {associatedProducts.map(p => (
                       <Grid xs={12} md={6} key={p.id}>
                           <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, '&:hover': { borderColor: 'primary.main', boxShadow: 1 } }}>
                               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                   <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                            <Package size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold" lineHeight={1.2}>
                                                {p.templateName}
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                                {p.attributes.filter(a => a.name !== inspectedValue?.attr).map((a, i) => (
                                                    <Chip key={i} label={`${a.name}: ${a.value}`} size="small" sx={{ height: 20, fontSize: 10 }} />
                                                ))}
                                            </Box>
                                        </Box>
                                   </Box>
                                   <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="body2" fontWeight="bold" fontFamily="monospace" color="primary.main">
                                            {formatPrice(p.price || 0)} <Typography component="span" variant="caption" color="text.secondary">{p.currency}</Typography>
                                        </Typography>
                                        {p.defaultCode && (
                                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 }}>
                                                {p.defaultCode}
                                            </Typography>
                                        )}
                                   </Box>
                               </Box>
                               
                               <Divider sx={{ my: 1 }} />
                               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                                       <Barcode size={14} />
                                       <Typography variant="caption">{p.barcode || 'No Barcode'}</Typography>
                                   </Box>
                                   <Typography variant="caption" color="text.secondary">
                                       {p.tracking !== 'none' ? `Tracking: ${p.tracking}` : 'No Tracking'}
                                   </Typography>
                               </Box>
                           </Paper>
                       </Grid>
                   ))}
               </Grid>
           </DialogContent>
       </Dialog>

       <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 10 }}>
         <TextField
            placeholder="بحث في الخصائص والقيم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
                startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment>,
            }}
            sx={{ maxWidth: 300 }}
         />
        <Typography variant="caption" color="text.secondary">
            {sortedAttributes.length} Attribute(s)
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'background.default' }}>
        <Grid container spacing={3}>
            {sortedAttributes.map((attr) => (
                <Grid xs={12} md={6} xl={4} key={attr.name}>
                    <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Header */}
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                <Box sx={{ p: 0.5, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, color: 'primary.main', display: 'flex' }}>
                                    <Tags size={14} />
                                </Box>
                                {editingAttr === attr.name ? (
                                    <TextField
                                        autoFocus
                                        size="small"
                                        value={tempName}
                                        onChange={(e) => setTempName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && saveAttr()}
                                        onBlur={saveAttr}
                                        sx={{ flex: 1 }}
                                    />
                                ) : (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', '&:hover .edit-icon': { opacity: 1 } }} onClick={() => startEditAttr(attr.name)}>
                                        <Typography variant="subtitle2" fontWeight="bold" noWrap title={attr.name}>{attr.name}</Typography>
                                        <Edit2 size={12} className="edit-icon" style={{ opacity: 0, transition: '0.2s' }} />
                                    </Box>
                                )}
                            </Box>
                            <Chip label={`${attr.values.length} Values`} size="small" sx={{ fontSize: 10, height: 20 }} />
                        </Box>

                        {/* Config Settings */}
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                        <Settings size={10} /> CREATION
                                    </Typography>
                                    <Select 
                                        size="small"
                                        value={attr.config.creationMode}
                                        onChange={(e) => onUpdateAttributeConfig(attr.name, { ...attr.config, creationMode: e.target.value as AttributeCreationMode })}
                                        fullWidth
                                        sx={{ fontSize: 12, height: 28 }}
                                    >
                                        <MenuItem value="always">Instantly</MenuItem>
                                        <MenuItem value="dynamic">Dynamically</MenuItem>
                                        <MenuItem value="no_variant">Never</MenuItem>
                                    </Select>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                        <Palette size={10} /> DISPLAY
                                    </Typography>
                                    <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderRadius: 1, p: 0.5, border: 1, borderColor: 'divider' }}>
                                        {(['select', 'radio', 'pills'] as AttributeDisplayType[]).map(type => (
                                            <IconButton
                                                key={type}
                                                size="small"
                                                onClick={() => onUpdateAttributeConfig(attr.name, { ...attr.config, displayType: type })}
                                                sx={{ 
                                                    flex: 1, 
                                                    borderRadius: 1, 
                                                    p: 0.5,
                                                    bgcolor: attr.config.displayType === type ? 'background.paper' : 'transparent',
                                                    color: attr.config.displayType === type ? 'primary.main' : 'text.disabled',
                                                    boxShadow: attr.config.displayType === type ? 1 : 0
                                                }}
                                            >
                                                {type === 'select' && <List size={14} />}
                                                {type === 'radio' && <MousePointerClick size={14} />}
                                                {type === 'pills' && <Type size={14} />}
                                            </IconButton>
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        </Box>

                        {/* Values Preview (Grid) */}
                        <Box sx={{ flex: 1, p: 2, bgcolor: 'background.default', overflowY: 'auto', maxHeight: 200 }}>
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {attr.values.map(val => (
                                    <Box key={val} sx={{ position: 'relative', '&:hover .val-edit': { opacity: 1 } }}>
                                        {editingValue?.attr === attr.name && editingValue?.val === val ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, position: 'absolute', zIndex: 10, top: 0, left: 0, bgcolor: 'background.paper', boxShadow: 3, border: 1, borderColor: 'primary.main', borderRadius: 1, p: 0.5, minWidth: 100 }}>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={tempName}
                                                    onChange={(e) => setTempName(e.target.value)}
                                                    style={{ width: '100%', outline: 'none', border: 'none', background: 'transparent', fontSize: '12px', color: theme.palette.text.primary }}
                                                    onKeyDown={(e) => e.key === 'Enter' && saveValue()}
                                                    onBlur={saveValue}
                                                />
                                                <Check size={12} style={{ cursor: 'pointer', color: theme.palette.success.main }} onClick={saveValue} />
                                            </Box>
                                        ) : (
                                            <Button 
                                                size="small"
                                                onClick={() => handleValueClick(attr.name, val)}
                                                sx={{ 
                                                    textTransform: 'none', 
                                                    fontSize: 11, 
                                                    py: 0.5, 
                                                    color: 'text.primary',
                                                    bgcolor: attr.config.displayType === 'pills' ? 'background.paper' : 'transparent',
                                                    border: 1, 
                                                    borderColor: attr.config.displayType === 'pills' ? 'divider' : 'divider',
                                                    borderStyle: attr.config.displayType === 'pills' ? 'solid' : 'dashed',
                                                    '&:hover': { borderColor: 'primary.main', pr: 4 }
                                                }}
                                            >
                                                <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
                                                
                                                <Box 
                                                    className="val-edit"
                                                    onClick={(e) => startEditValue(attr.name, val, e)}
                                                    sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 24, bgcolor: 'action.hover', borderLeft: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }}
                                                >
                                                    <Edit2 size={10} />
                                                </Box>
                                            </Button>
                                        )}
                                    </Box>
                                ))}
                             </Box>
                        </Box>
                    </Paper>
                </Grid>
            ))}
        </Grid>
        
        {sortedAttributes.length === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'text.disabled' }}>
                <Tags size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                <Typography>لا توجد خصائص للعرض</Typography>
            </Box>
        )}
      </Box>
    </Box>
  );
};
