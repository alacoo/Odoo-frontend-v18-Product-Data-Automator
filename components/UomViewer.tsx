
import React, { useState, useMemo } from 'react';
import { Search, Scale, Ruler, Clock, Box as BoxIcon, LayoutGrid, Copy, Check, Info, MousePointerClick } from 'lucide-react';
import { UOM_DATA } from '../data/uomData';
import { 
    Box, TextField, Typography, Grid, Card, CardContent, 
    Chip, InputAdornment, IconButton, Tooltip, Avatar, useTheme, alpha, Fade, Paper, Divider 
} from '@mui/material';

export const UomViewer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const theme = useTheme();

  const filteredData = useMemo(() => {
      return UOM_DATA.map(cat => ({
        ...cat,
        units: cat.units.filter(u => 
          u.toLowerCase().includes(searchTerm.toLowerCase()) || 
          cat.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(cat => cat.units.length > 0 || cat.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm]);

  const totalUnits = useMemo(() => filteredData.reduce((acc, cat) => acc + cat.units.length, 0), [filteredData]);

  const getCategoryConfig = (id: string) => {
    if (id.includes('kgm')) return { icon: Scale, color: theme.palette.warning.main, label: 'Weight' };
    if (id.includes('length')) return { icon: Ruler, color: theme.palette.info.main, label: 'Length' };
    if (id.includes('wtime')) return { icon: Clock, color: theme.palette.error.main, label: 'Time' };
    if (id.includes('surface')) return { icon: LayoutGrid, color: theme.palette.success.main, label: 'Surface' };
    if (id.includes('vol')) return { icon: BoxIcon, color: '#8e44ad', label: 'Volume' }; // Purple
    return { icon: BoxIcon, color: theme.palette.primary.main, label: 'Unit' };
  };

  const handleCopy = (text: string, context: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
       {/* Header Section */}
       <Paper 
            elevation={0} 
            sx={{ 
                p: 3, 
                mb: 3, 
                borderBottom: 1, 
                borderColor: 'divider', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                borderRadius: 0,
                bgcolor: 'background.paper'
            }}
       >
           <Box>
               <Typography variant="h5" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                   <Ruler className="text-primary" /> Units of Measure
               </Typography>
               <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                   Reference guide for Odoo v18 measurement categories and XML IDs.
               </Typography>
           </Box>

           <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' }, mr: 2 }}>
                    <Typography variant="caption" display="block" color="text.secondary">Categories</Typography>
                    <Typography variant="h6" lineHeight={1} fontWeight="bold">{filteredData.length}</Typography>
                </Box>
                <Box sx={{ width: 1, height: 40, bgcolor: 'divider', display: { xs: 'none', md: 'block' } }} />
                <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' }, mr: 2 }}>
                    <Typography variant="caption" display="block" color="text.secondary">Total Units</Typography>
                    <Typography variant="h6" lineHeight={1} fontWeight="bold">{totalUnits}</Typography>
                </Box>

                <TextField 
                    placeholder="Search units..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment>,
                    }}
                    sx={{ width: 280 }}
                />
           </Box>
       </Paper>

      <Box sx={{ px: 3, pb: 3, overflowY: 'auto', flex: 1 }}>
        <Grid container spacing={3}>
            {filteredData.map(cat => {
            const { icon: Icon, color, label } = getCategoryConfig(cat.id);
            
            return (
                <Grid xs={12} md={6} xl={4} key={cat.id}>
                    <Card 
                        elevation={0}
                        sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            borderRadius: 3, 
                            border: 1, 
                            borderColor: 'divider',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'visible',
                            '&:hover': { 
                                borderColor: color, 
                                boxShadow: `0 8px 24px ${alpha(color, 0.15)}`,
                                transform: 'translateY(-2px)'
                            }
                        }}
                    >
                        {/* Decorative Top Line */}
                        <Box sx={{ position: 'absolute', top: -1, left: 20, right: 20, height: 3, bgcolor: color, borderRadius: '0 0 4px 4px', opacity: 0.8 }} />

                        <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            
                            {/* Card Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Avatar variant="rounded" sx={{ bgcolor: alpha(color, 0.1), color: color, width: 48, height: 48, borderRadius: 2 }}>
                                        <Icon size={24} strokeWidth={1.5} />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: color, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            {label}
                                        </Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {cat.name}
                                        </Typography>
                                    </Box>
                                </Box>
                                
                                <Tooltip title={copiedId === cat.id ? "Copied ID!" : "Copy Category ID"}>
                                    <IconButton 
                                        size="small" 
                                        onClick={() => handleCopy(cat.id, 'id')}
                                        sx={{ 
                                            bgcolor: 'action.hover', 
                                            border: 1, 
                                            borderColor: 'divider',
                                            '&:hover': { bgcolor: color, color: 'white', borderColor: color } 
                                        }}
                                    >
                                        {copiedId === cat.id ? <Check size={16} /> : <Copy size={16} />}
                                    </IconButton>
                                </Tooltip>
                            </Box>

                            {/* ID Display */}
                            <Box 
                                onClick={() => handleCopy(cat.id, 'id')}
                                sx={{ 
                                    fontFamily: 'monospace', 
                                    fontSize: 11, 
                                    color: 'text.secondary', 
                                    bgcolor: 'background.default', 
                                    p: 1, 
                                    borderRadius: 1, 
                                    border: 1, 
                                    borderColor: 'divider',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    cursor: 'pointer',
                                    '&:hover': { color: 'text.primary', borderColor: color }
                                }}
                            >
                                <Info size={12} />
                                {cat.id}
                            </Box>

                            <Divider />

                            {/* Units List */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {cat.units.map((unit, idx) => (
                                    <Tooltip key={idx} title="Click to copy unit name" arrow>
                                        <Chip 
                                            label={unit}
                                            onClick={() => handleCopy(unit, 'unit')}
                                            size="small"
                                            icon={copiedId === unit ? <Check size={12} /> : undefined}
                                            sx={{ 
                                                borderRadius: 1.5, 
                                                bgcolor: copiedId === unit ? alpha(color, 0.2) : alpha(theme.palette.action.hover, 0.5), 
                                                color: copiedId === unit ? color : 'text.primary',
                                                border: 1, 
                                                borderColor: copiedId === unit ? color : 'transparent',
                                                fontWeight: 500,
                                                '&:hover': { 
                                                    bgcolor: alpha(color, 0.1),
                                                    color: color,
                                                    borderColor: alpha(color, 0.3)
                                                }
                                            }}
                                        />
                                    </Tooltip>
                                ))}
                                {cat.units.length === 0 && (
                                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                        No matching units found.
                                    </Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            );
            })}
        </Grid>
        
        {filteredData.length === 0 && (
            <Fade in>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: 'text.secondary', opacity: 0.7 }}>
                    <Search size={64} strokeWidth={1} style={{ marginBottom: 24, opacity: 0.5 }} />
                    <Typography variant="h5" fontWeight="bold">No categories found</Typography>
                    <Typography variant="body1">Try searching for a specific unit or category name.</Typography>
                </Box>
            </Fade>
        )}
      </Box>
    </Box>
  );
};
