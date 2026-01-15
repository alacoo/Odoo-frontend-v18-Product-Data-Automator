
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { ParsedProduct, ActiveTab, SyncCapabilities } from '../types';
import { 
    Search, Trash2, Package, Settings2, 
    ArrowUpDown, Plus, Download, ScanLine, 
    Check, X, Filter, Image as ImageIcon, Upload
} from 'lucide-react';
import { 
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Checkbox, IconButton, TextField, Typography, Button, Chip, Menu, MenuItem, 
    InputAdornment, Tooltip, useTheme, Paper, InputBase, Divider, Fade, Stack, alpha
} from '@mui/material';

interface Props {
  products: ParsedProduct[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, field: keyof ParsedProduct, value: any) => void;
  onNavigate: (tab: ActiveTab, query: string) => void;
  onAdd: () => void;
  renderActions?: (selectedIds: Set<string>, clearSelection: () => void) => React.ReactNode;
  capabilities?: SyncCapabilities;
}

interface VisibleColumns {
  image: boolean;
  ref: boolean;
  barcode: boolean;
  price: boolean; 
  sqm: boolean;   
  roll: boolean;  
  attributes: boolean;
  type: boolean;
}

// --- Smart Image Component ---
// Tries to load image from: 1. Base64 (User Upload) -> 2. Local File by Code -> 3. Local File by Name -> 4. Placeholder
const SmartImage = ({ product, onClick, canWrite }: { product: ParsedProduct, onClick: () => void, canWrite: boolean }) => {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);
    const [attemptedName, setAttemptedName] = useState(false);

    useEffect(() => {
        setHasError(false);
        setAttemptedName(false);

        if (product.image) {
            // Priority 1: Direct Base64/Url match
            setImgSrc(product.image.startsWith('data:') ? product.image : `data:image/png;base64,${product.image}`);
        } else if (product.defaultCode) {
            // Priority 2: Auto-discovery by Code (e.g., public/product_images/CODE123.jpg)
            // We assume the user creates a folder named 'product_images' in the public directory
            const safeCode = product.defaultCode.trim(); 
            setImgSrc(`/product_images/${safeCode}.jpg`);
        } else if (product.templateName) {
             // Priority 3: Auto-discovery by Name (Start here if no code)
             setImgSrc(`/product_images/${product.templateName.trim()}.jpg`);
             setAttemptedName(true);
        } else {
            setHasError(true);
        }
    }, [product.image, product.defaultCode, product.templateName]);

    const handleError = () => {
        if (!attemptedName && product.templateName && imgSrc && !imgSrc.includes(product.templateName)) {
            // If failed by Code, try by Name
            setImgSrc(`/product_images/${product.templateName.trim()}.jpg`);
            setAttemptedName(true);
        } else {
            // If failed by Name (or both), show placeholder
            setHasError(true);
        }
    };

    return (
        <Box 
            onClick={onClick}
            sx={{ 
                width: 48, height: 48, 
                borderRadius: 2, 
                bgcolor: 'action.hover',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                cursor: canWrite ? 'pointer' : 'default',
                border: 1, borderColor: 'divider',
                position: 'relative',
                '&:hover .upload-overlay': { opacity: 1 }
            }}
        >
            {!hasError && imgSrc ? (
                <img 
                    src={imgSrc} 
                    alt="" 
                    onError={handleError}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
            ) : (
                <ImageIcon size={20} className="text-muted" style={{ opacity: 0.3 }} />
            )}
            
            {canWrite && (
                <Box 
                    className="upload-overlay" 
                    sx={{ 
                        position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.2s', color: 'white'
                    }}
                >
                    <Upload size={16} />
                </Box>
            )}
        </Box>
    );
};

// --- Sub-component for formatted Price editing ---
const PriceCell = ({ 
    value, 
    currency, 
    label, 
    isPrimary = false, 
    hasMultiCurrency = false,
    onChange,
    disabled = false
}: { 
    value: number | undefined, 
    currency: string, 
    label: string, 
    isPrimary?: boolean, 
    hasMultiCurrency?: boolean,
    onChange: (val: number) => void,
    disabled?: boolean
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const displayValue = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2,
    }).format(value || 0);

    const handleBlur = () => {
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') setIsEditing(false);
    };

    if (isEditing) {
        return (
            <TextField
                inputRef={inputRef}
                type="number"
                size="small"
                variant="outlined"
                value={value || 0}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                InputProps={{
                    sx: { height: 24, fontSize: 13, textAlign: 'right', bgcolor: 'background.paper' }
                }}
                sx={{ width: 80 }}
            />
        );
    }

    return (
        <Box 
            onClick={() => !disabled && setIsEditing(true)} 
            sx={{ 
                cursor: disabled ? 'default' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-end', 
                gap: 0.5,
                '&:hover': { bgcolor: disabled ? 'transparent' : 'action.hover', borderRadius: 1 }
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' }}>
                 <Typography 
                    variant={isPrimary ? "body2" : "caption"} 
                    sx={{ fontFamily: 'monospace', fontWeight: isPrimary ? 700 : 400, color: isPrimary ? 'text.primary' : 'text.secondary' }}
                 >
                    {displayValue}
                 </Typography>
                 {hasMultiCurrency && isPrimary && (
                     <Box component="span" sx={{ position: 'absolute', left: -8, top: 0, fontSize: 8, color: 'success.main' }}>●</Box>
                 )}
            </Box>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase' }}>
                {currency || 'YER'}
            </Typography>
        </Box>
    );
};


export const ProductTable: React.FC<Props> = ({ products, onDelete, onUpdate, onNavigate, onAdd, renderActions, capabilities }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof ParsedProduct, direction: 'asc' | 'desc' } | null>(null);
  const [massEditPrice, setMassEditPrice] = useState<string>('');
  
  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingForId, setUploadingForId] = useState<string | null>(null);

  const theme = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Default true if capabilities not provided (e.g. demo mode)
  const canWrite = capabilities ? capabilities.canWrite : true;
  const canCreate = capabilities ? capabilities.canCreate : true;
  const canDelete = capabilities ? (capabilities.canDelete || capabilities.canWrite) : true; 

  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    image: true,
    ref: true,
    barcode: false,
    price: true,
    sqm: true,
    roll: true,
    attributes: true,
    type: false
  });
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => 
      p.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.defaultCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [products, searchTerm, sortConfig]);

  const getWidthFromAttributes = (p: ParsedProduct): number | null => {
      const widthAttr = p.attributes.find(a => a.name.includes('عرض') || a.name.includes('Width'));
      if (widthAttr) {
          const match = widthAttr.value.match(/([\d\.]+)/);
          return match ? parseFloat(match[1]) : null;
      }
      return null;
  };

  const getSqmPrice = (p: ParsedProduct): number => {
      if (p.variant_price_per_sqm && p.variant_price_per_sqm > 0) return p.variant_price_per_sqm;
      const width = getWidthFromAttributes(p);
      if (width && width > 0 && p.price) {
          return p.price / width;
      }
      return 0;
  };

  const formatPrice = (val: number) => {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleColumn = (key: keyof VisibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) {
      selectedIds.forEach(id => onDelete(id));
      setSelectedIds(new Set());
    }
  };

  const handleMassUpdatePrice = () => {
      const price = parseFloat(massEditPrice);
      if (isNaN(price)) return;
      if (confirm(`Update price to ${price} for ${selectedIds.size} items?`)) {
          selectedIds.forEach(id => onUpdate(id, 'price', price));
          setMassEditPrice('');
          setSelectedIds(new Set());
      }
  };

  const handleExport = () => {
      const dataToExport = filteredProducts.map(p => ({
          InternalReference: p.defaultCode,
          Name: p.templateName,
          Barcode: p.barcode,
          Attributes: p.attributes.map(a => `${a.name}:${a.value}`).join(', '),
          SalesPrice: p.price,
          CostPrice: p.standard_price,
          PricePerSQM: getSqmPrice(p),
          PricePerRoll: p.uom === 'm' ? (p.price || 0) * 50 : 0,
          Currency: p.currency,
          UOM: p.uom,
          Weight: p.weight,
          Type: p.detailedType
      }));
      
      const csv = Papa.unparse(dataToExport);
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleSort = (key: keyof ParsedProduct) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearSearch = () => {
      setSearchTerm('');
      searchInputRef.current?.focus();
  };

  // Image Upload Logic
  const handleImageClick = (id: string) => {
      if (!canWrite) return;
      setUploadingForId(id);
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && uploadingForId) {
          const reader = new FileReader();
          reader.onload = (evt) => {
              const base64 = evt.target?.result as string;
              // Remove data:image/png;base64, prefix if needed by Odoo (usually strictly base64)
              // But for local preview we keep it. Odoo service will sanitize it.
              onUpdate(uploadingForId, 'image', base64);
              setUploadingForId(null);
          };
          reader.readAsDataURL(file);
      }
      e.target.value = ''; // Reset
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      {/* Hidden File Input for Image Uploads */}
      <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={handleFileChange}
      />

      {/* Modern Toolbar */}
      <Box sx={{ 
          p: 2, px: 3,
          borderBottom: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: 2, 
          position: 'sticky', 
          top: 0, 
          bgcolor: 'background.paper', 
          zIndex: 10 
      }}>
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, maxWidth: 800 }}>
             
             {/* Floating Search Bar */}
             <Paper
                elevation={0}
                sx={{
                    p: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: 3,
                    border: 1,
                    borderColor: 'divider',
                    transition: 'all 0.2s ease',
                    '&:focus-within': {
                        borderColor: 'primary.main',
                        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`
                    }
                }}
             >
                <IconButton sx={{ p: '10px' }} aria-label="search" disabled>
                    <Search size={18} color={theme.palette.text.secondary} />
                </IconButton>
                <InputBase
                    inputRef={searchInputRef}
                    sx={{ ml: 1, flex: 1, fontSize: 14 }}
                    placeholder="Search products by name, code or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Fade in={searchTerm.length > 0}>
                    <IconButton sx={{ p: '10px' }} aria-label="clear" onClick={clearSearch}>
                        <X size={16} />
                    </IconButton>
                </Fade>
             </Paper>
             
             <Divider orientation="vertical" flexItem sx={{ height: 24, my: 'auto' }} />

             <Box>
               <Button 
                 onClick={(e) => setAnchorEl(e.currentTarget)}
                 color="inherit"
                 startIcon={<Filter size={16} />}
                 endIcon={<Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, minWidth: 16, textAlign: 'center' }}>{Object.values(visibleColumns).filter(Boolean).length}</Typography>}
                 size="small"
                 sx={{ borderRadius: 2, px: 1.5, borderColor: 'divider', border: 1 }}
               >
                 Columns
               </Button>
               <Menu
                 anchorEl={anchorEl}
                 open={openMenu}
                 onClose={() => setAnchorEl(null)}
                 PaperProps={{ sx: { width: 200, borderRadius: 2, mt: 1 } }}
               >
                 {Object.keys(visibleColumns).map((key) => (
                    <MenuItem key={key} onClick={() => toggleColumn(key as keyof VisibleColumns)} dense>
                        <Checkbox checked={visibleColumns[key as keyof VisibleColumns]} size="small" />
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{key}</Typography>
                    </MenuItem>
                 ))}
               </Menu>
             </Box>
         </Box>

         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
             {selectedIds.size > 0 ? (
                 <Paper 
                    elevation={0}
                    sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2, 
                        bgcolor: 'primary.main', 
                        color: 'primary.contrastText', 
                        p: 0.5, px: 2, 
                        borderRadius: 3 
                    }}
                 >
                     <Typography variant="caption" fontWeight="bold">
                        {selectedIds.size} Selected
                     </Typography>
                     
                     <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />

                     {canWrite && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TextField 
                                placeholder="Price..." 
                                size="small"
                                value={massEditPrice}
                                onChange={(e) => setMassEditPrice(e.target.value)}
                                sx={{ width: 80, '& input': { p: 0.5, fontSize: 12, bgcolor: 'background.paper', borderRadius: 1, color: 'text.primary' } }}
                            />
                            <IconButton onClick={handleMassUpdatePrice} size="small" sx={{ color: 'white' }}>
                                <Check size={16} />
                            </IconButton>
                        </Box>
                     )}

                     {renderActions && renderActions(selectedIds, () => setSelectedIds(new Set()))}

                     {canDelete && (
                         <Tooltip title="Delete Selected">
                             <IconButton 
                                onClick={handleBulkDelete}
                                size="small"
                                sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                             >
                                <Trash2 size={16} />
                             </IconButton>
                         </Tooltip>
                     )}
                 </Paper>
             ) : (
                 <Stack direction="row" spacing={1}>
                     <Button 
                        onClick={handleExport} 
                        startIcon={<Download size={16} />} 
                        size="small" 
                        color="inherit"
                        sx={{ borderRadius: 2 }}
                     >
                         CSV
                     </Button>
                     {canCreate && (
                         <Button 
                            onClick={onAdd}
                            variant="contained"
                            color="primary"
                            startIcon={<Plus size={18} />}
                            size="small"
                            sx={{ borderRadius: 2, px: 3, boxShadow: 2 }}
                         >
                            Add Product
                         </Button>
                     )}
                 </Stack>
             )}
         </Box>
      </Box>

      {/* Table */}
      <TableContainer sx={{ flex: 1 }}>
         <Table stickyHeader size="small">
            <TableHead>
                <TableRow>
                    <TableCell padding="checkbox">
                        <Checkbox 
                            indeterminate={selectedIds.size > 0 && selectedIds.size < filteredProducts.length}
                            checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                            onChange={toggleSelectAll}
                            size="small"
                        />
                    </TableCell>
                    
                    {visibleColumns.image && <TableCell sx={{ width: 60 }}></TableCell>}

                    <TableCell onClick={() => handleSort('templateName')} sx={{ cursor: 'pointer' }}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            المنتج <ArrowUpDown size={12} style={{ opacity: 0.5 }} />
                        </Box>
                    </TableCell>
                    
                    {visibleColumns.ref && (
                      <TableCell onClick={() => handleSort('defaultCode')} sx={{ cursor: 'pointer' }}>Ref</TableCell>
                    )}
                    
                    {visibleColumns.sqm && <TableCell align="right" sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.15)' : 'info.50' }}>سعر م²</TableCell>}
                    {visibleColumns.price && <TableCell align="right">سعر م.ط</TableCell>}
                    {visibleColumns.roll && <TableCell align="right" sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.15)' : 'success.50' }}>سعر اللفة (50م)</TableCell>}
                    {visibleColumns.type && <TableCell sx={{ width: 120 }}>النوع</TableCell>}
                    {visibleColumns.barcode && <TableCell sx={{ width: 140 }}>الباركود</TableCell>}
                    {visibleColumns.attributes && <TableCell sx={{ width: '25%' }}>الخصائص</TableCell>}
                    <TableCell padding="none"></TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {filteredProducts.map(product => {
                    const sqmPrice = getSqmPrice(product);
                    const rollPrice = product.uom === 'm' ? (product.price || 0) * 50 : null;
                    const hasMultiCurrency = product.multiCurrencyPrices && product.multiCurrencyPrices.length > 0;
                    
                    return (
                    <TableRow key={product.id} selected={selectedIds.has(product.id)} hover>
                        <TableCell padding="checkbox">
                            <Checkbox 
                                checked={selectedIds.has(product.id)}
                                onChange={() => toggleSelectOne(product.id)}
                                size="small"
                            />
                        </TableCell>

                        {visibleColumns.image && (
                            <TableCell padding="none" align="center">
                                <SmartImage 
                                    product={product} 
                                    onClick={() => handleImageClick(product.id)} 
                                    canWrite={canWrite}
                                />
                            </TableCell>
                        )}

                        <TableCell>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                <Box sx={{ 
                                    p: 0.5, borderRadius: 1, 
                                    bgcolor: product.detailedType === 'service' ? 'info.main' : 'action.selected',
                                    color: product.detailedType === 'service' ? 'white' : 'text.secondary',
                                    border: 1, borderColor: 'divider'
                                }}>
                                    {product.detailedType === 'service' ? <Settings2 size={16} /> : <Package size={16} />}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    {canWrite ? (
                                        <TextField
                                            variant="standard"
                                            fullWidth
                                            value={product.templateName}
                                            onChange={(e) => onUpdate(product.id, 'templateName', e.target.value)}
                                            InputProps={{ disableUnderline: true, sx: { fontSize: 14, fontWeight: 500 } }}
                                        />
                                    ) : (
                                        <Typography variant="body2" fontWeight={500} sx={{ py: 0.5 }}>
                                            {product.templateName}
                                        </Typography>
                                    )}
                                    <Typography 
                                        variant="caption" 
                                        color="text.secondary" 
                                        sx={{ 
                                            display: 'block', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', 
                                            cursor: 'pointer', '&:hover': { textDecoration: 'underline' } 
                                        }}
                                        onClick={() => onNavigate(ActiveTab.TEMPLATES, product.templateName)}
                                    >
                                        {product.rawInput || product.templateName}
                                    </Typography>
                                </Box>
                            </Box>
                        </TableCell>

                        {visibleColumns.ref && (
                          <TableCell>
                              {canWrite ? (
                                <TextField
                                    variant="standard"
                                    value={product.defaultCode}
                                    placeholder="NO REF"
                                    onChange={(e) => onUpdate(product.id, 'defaultCode', e.target.value)}
                                    InputProps={{ 
                                        disableUnderline: true, 
                                        sx: { 
                                            fontFamily: 'monospace', fontSize: 12, 
                                            color: !product.defaultCode ? 'error.main' : 'text.primary',
                                            bgcolor: !product.defaultCode ? 'error.main' : 'transparent',
                                            ...( !product.defaultCode ? { color: 'white', px: 0.5, borderRadius: 0.5 } : {} )
                                        } 
                                    }}
                                />
                              ) : (
                                <Typography variant="caption" fontFamily="monospace">
                                    {product.defaultCode || '-'}
                                </Typography>
                              )}
                          </TableCell>
                        )}

                        {visibleColumns.sqm && (
                            <TableCell align="right" sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.15)' : 'info.50' }}>
                                {sqmPrice > 0 ? (
                                    <Box>
                                        <Typography variant="body2" color="info.main" fontWeight={600}>
                                            {formatPrice(sqmPrice)}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">/m²</Typography>
                                    </Box>
                                ) : <Typography variant="caption" color="text.disabled">-</Typography>}
                            </TableCell>
                        )}

                        {visibleColumns.price && (
                          <TableCell align="right">
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                  <PriceCell 
                                    value={product.price}
                                    currency={product.currency || 'YER'}
                                    label="Sale"
                                    isPrimary={true}
                                    hasMultiCurrency={hasMultiCurrency}
                                    onChange={(val) => onUpdate(product.id, 'price', val)}
                                    disabled={!canWrite}
                                  />
                                  <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.6 }}>
                                      <Typography variant="caption" sx={{ mr: 0.5 }}>Cost</Typography>
                                      <PriceCell 
                                        value={product.standard_price}
                                        currency={product.currency || 'YER'}
                                        label="Cost"
                                        isPrimary={false}
                                        onChange={(val) => onUpdate(product.id, 'standard_price', val)}
                                        disabled={!canWrite}
                                      />
                                  </Box>
                              </Box>
                          </TableCell>
                        )}

                        {visibleColumns.roll && (
                            <TableCell align="right" sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.15)' : 'success.50' }}>
                                {rollPrice !== null ? (
                                    <Box>
                                        <Typography variant="body2" color="success.main" fontWeight={700}>
                                            {formatPrice(rollPrice)}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">/50m</Typography>
                                    </Box>
                                ) : <Typography variant="caption" color="text.disabled">-</Typography>}
                            </TableCell>
                        )}

                        {visibleColumns.type && (
                            <TableCell>
                                <TextField
                                    select
                                    size="small"
                                    value={product.detailedType}
                                    onChange={(e) => onUpdate(product.id, 'detailedType', e.target.value)}
                                    variant="outlined"
                                    disabled={!canWrite}
                                    InputProps={{ sx: { fontSize: 12, height: 28 } }}
                                    sx={{ width: 110 }}
                                >
                                    <MenuItem value="product">Storable</MenuItem>
                                    <MenuItem value="consu">Consumable</MenuItem>
                                    <MenuItem value="service">Service</MenuItem>
                                </TextField>
                            </TableCell>
                        )}

                        {visibleColumns.barcode && (
                          <TableCell>
                                <TextField
                                    size="small"
                                    value={product.barcode || ''}
                                    placeholder="Barcode"
                                    disabled={!canWrite}
                                    onChange={(e) => onUpdate(product.id, 'barcode', e.target.value)}
                                    InputProps={{ 
                                        startAdornment: <InputAdornment position="start"><ScanLine size={12}/></InputAdornment>,
                                        sx: { fontSize: 12, height: 28 } 
                                    }}
                                />
                          </TableCell>
                        )}

                        {visibleColumns.attributes && (
                          <TableCell>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {product.attributes.map((attr, idx) => (
                                      <Chip 
                                        key={idx} 
                                        label={`${attr.name}: ${attr.value}`} 
                                        size="small" 
                                        variant="outlined"
                                        sx={{ fontSize: 10, height: 20, bgcolor: 'background.paper' }}
                                      />
                                  ))}
                              </Box>
                          </TableCell>
                        )}

                        <TableCell>
                            <IconButton 
                                onClick={() => onDelete(product.id)} 
                                size="small" 
                                color="error" 
                                disabled={!canDelete}
                                sx={{ opacity: canDelete ? 0.3 : 0.1, '&:hover': { opacity: 1, bgcolor: 'error.main', color: 'white' } }}
                            >
                                <Trash2 size={16} />
                            </IconButton>
                        </TableCell>
                    </TableRow>
                )})}
            </TableBody>
         </Table>
      </TableContainer>
    </Box>
  );
};
