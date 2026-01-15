
import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { ParsedProduct, GlobalAttributeConfig, OdooExportData } from '../types';
import { generateOdooData } from '../utils/csvGenerator';
import { FileDown, Eye, Download, FileText, ChevronRight, AlertCircle, Check, Columns } from 'lucide-react';
import { 
    Box, Paper, Typography, Button, Checkbox, IconButton, Divider, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    useTheme, alpha, Chip, FormControlLabel, Tooltip
} from '@mui/material';

interface Props {
  products: ParsedProduct[];
  attributeConfigs: Map<string, GlobalAttributeConfig>;
  onBack: () => void;
}

type FileType = keyof OdooExportData;

const FILE_DEFINITIONS: { key: FileType; label: string; description: string }[] = [
  { key: 'attributes', label: '1. Product Attributes', description: 'Defines dimensions (Size, Color, etc.)' },
  { key: 'attributeValues', label: '2. Attribute Values', description: 'Specific values (Small, Red, etc.)' },
  { key: 'productTemplates', label: '3. Product Templates', description: 'Main product cards & configuration' },
  { key: 'productVariants', label: '4. Product Variants', description: 'Specific SKU details & prices' },
];

export const ExportConfigurator: React.FC<Props> = ({ products, attributeConfigs, onBack }) => {
  const [activeFile, setActiveFile] = useState<FileType>('productTemplates');
  const [selectedFiles, setSelectedFiles] = useState<Record<FileType, boolean>>({
    attributes: true,
    attributeValues: true,
    productTemplates: true,
    productVariants: true,
  });

  const theme = useTheme();

  // Raw data generated from current state
  const rawData: OdooExportData = useMemo(() => {
    return generateOdooData(products, attributeConfigs);
  }, [products, attributeConfigs]);

  // Track enabled columns for each file type
  const [columnConfig, setColumnConfig] = useState<Record<FileType, Record<string, boolean>>>({
    attributes: {},
    attributeValues: {},
    productTemplates: {},
    productVariants: {},
  });

  // Initialize columns on load
  useEffect(() => {
    const newConfig = { ...columnConfig };
    
    (Object.keys(rawData) as FileType[]).forEach(key => {
      const rows = rawData[key];
      if (rows.length > 0) {
        const keys = Object.keys(rows[0]);
        const currentConfig = newConfig[key] || {};
        
        keys.forEach(k => {
          if (currentConfig[k] === undefined) {
             // By default, enable all columns
             currentConfig[k] = true;
          }
        });
        newConfig[key] = currentConfig;
      }
    });
    setColumnConfig(newConfig);
  }, [rawData]);

  const toggleColumn = (file: FileType, column: string) => {
    setColumnConfig(prev => ({
      ...prev,
      [file]: {
        ...prev[file],
        [column]: !prev[file][column]
      }
    }));
  };

  const toggleFileSelection = (file: FileType) => {
    setSelectedFiles(prev => ({ ...prev, [file]: !prev[file] }));
  };

  const getProcessedData = (file: FileType) => {
    const rows = rawData[file];
    const config = columnConfig[file];
    if (!rows || rows.length === 0) return [];
    
    // Filter columns based on config
    return rows.map(row => {
      const newRow: any = {};
      Object.keys(row).forEach(key => {
        if (config[key] !== false) { // Default to true if undefined
          newRow[key] = row[key];
        }
      });
      return newRow;
    });
  };

  const handleDownload = (file: FileType) => {
    const data = getProcessedData(file);
    const csv = Papa.unparse(data);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${file}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    (Object.keys(selectedFiles) as FileType[]).forEach((file, index) => {
      if (selectedFiles[file]) {
        setTimeout(() => {
          handleDownload(file);
        }, index * 500);
      }
    });
  };

  const currentData = getProcessedData(activeFile);
  const allColumns = rawData[activeFile].length > 0 ? Object.keys(rawData[activeFile][0]) : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper 
        elevation={0} 
        sx={{ 
            px: 3, py: 2, 
            borderBottom: 1, borderColor: 'divider', 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            zIndex: 10, bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onBack} sx={{ bgcolor: 'action.hover' }}>
             {theme.direction === 'rtl' ? <ChevronRight /> : <ChevronRight style={{ transform: 'rotate(180deg)' }} />}
          </IconButton>
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FileDown size={24} color={theme.palette.primary.main} />
              Export Configurator
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review data, select columns, and download Odoo v18 compatible CSV files.
            </Typography>
          </Box>
        </Box>
        <Button 
          onClick={handleDownloadAll}
          variant="contained"
          size="large"
          startIcon={<Download size={18} />}
          sx={{ fontWeight: 'bold', borderRadius: 2 }}
        >
          Download Selected
        </Button>
      </Paper>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar: File Selection */}
        <Paper 
            elevation={0}
            sx={{ 
                width: 320, 
                borderRight: 1, borderColor: 'divider', 
                display: 'flex', flexDirection: 'column', 
                zIndex: 5, borderRadius: 0
            }}
        >
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
             <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                 Available Files
             </Typography>
             <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 0.5, fontSize: 10 }}>
                 Select files to download. Click on a row to preview/edit columns.
             </Typography>
          </Box>
          <List sx={{ p: 1 }}>
            {FILE_DEFINITIONS.map((def) => (
              <ListItem 
                key={def.key} 
                disablePadding 
                sx={{ mb: 1 }}
              >
                 <ListItemButton 
                    selected={activeFile === def.key}
                    onClick={() => setActiveFile(def.key)}
                    sx={{ 
                        borderRadius: 2, 
                        border: 1, 
                        borderColor: activeFile === def.key ? 'primary.main' : 'transparent',
                        bgcolor: activeFile === def.key ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                        '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
                        '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) }
                    }}
                 >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox 
                            edge="start"
                            checked={selectedFiles[def.key]}
                            onChange={() => toggleFileSelection(def.key)}
                            onClick={(e) => e.stopPropagation()}
                            size="small"
                        />
                    </ListItemIcon>
                    <ListItemText 
                        primary={def.label} 
                        secondary={def.description} 
                        primaryTypographyProps={{ fontWeight: 600, fontSize: 14, color: activeFile === def.key ? 'primary.main' : 'text.primary' }}
                        secondaryTypographyProps={{ fontSize: 11 }}
                    />
                    {activeFile === def.key && <Eye size={16} color={theme.palette.primary.main} style={{ opacity: 0.7 }} />}
                 </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Main Area: Preview & Columns */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
           {/* Toolbar */}
           <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                 <Chip 
                    icon={<FileText size={14} />} 
                    label={FILE_DEFINITIONS.find(f => f.key === activeFile)?.label} 
                    size="small" 
                    variant="outlined"
                    sx={{ fontWeight: 'bold' }}
                 />
                 <Chip label={`${currentData.length} Records`} size="small" sx={{ bgcolor: 'action.selected' }} />
              </Box>
              <Button 
                onClick={() => handleDownload(activeFile)} 
                size="small" 
                startIcon={<Download size={14} />}
                sx={{ textTransform: 'none' }}
              >
                  Download This File (CSV)
              </Button>
           </Box>

           <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Preview Table */}
              <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.paper' }}>
                  {currentData.length === 0 ? (
                      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.disabled' }}>
                          <AlertCircle size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                          <Typography>No data available to display</Typography>
                      </Box>
                  ) : (
                    <TableContainer>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    {Object.keys(currentData[0]).map(header => (
                                        <TableCell 
                                            key={header} 
                                            sx={{ 
                                                fontWeight: 'bold', 
                                                whiteSpace: 'nowrap', 
                                                bgcolor: 'background.default',
                                                borderBottom: 2,
                                                borderColor: 'divider' 
                                            }}
                                        >
                                            {header}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {currentData.slice(0, 50).map((row: any, idx: number) => (
                                    <TableRow key={idx} hover>
                                        {Object.values(row).map((val: any, vIdx) => (
                                            <TableCell 
                                                key={vIdx} 
                                                sx={{ 
                                                    whiteSpace: 'nowrap', 
                                                    maxWidth: 200, 
                                                    overflow: 'hidden', 
                                                    textOverflow: 'ellipsis',
                                                    fontFamily: 'monospace',
                                                    fontSize: 12
                                                }}
                                            >
                                                {String(val)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                  )}
                  {currentData.length > 50 && (
                      <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary">
                              Showing first 50 records only. Full file will contain all data.
                          </Typography>
                      </Box>
                  )}
              </Box>

              {/* Column Selector Panel */}
              <Paper 
                elevation={0}
                sx={{ 
                    width: 260, 
                    borderLeft: 1, borderColor: 'divider', 
                    display: 'flex', flexDirection: 'column',
                    borderRadius: 0,
                    bgcolor: 'background.default'
                }}
              >
                  <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Columns size={16} />
                      <Typography variant="subtitle2" fontWeight="bold">Column Visibility</Typography>
                  </Box>
                  <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                      {allColumns.map(col => (
                          <FormControlLabel
                            key={col}
                            control={
                                <Checkbox 
                                    checked={columnConfig[activeFile]?.[col] !== false}
                                    onChange={() => toggleColumn(activeFile, col)}
                                    disabled={col === 'id'}
                                    size="small"
                                />
                            }
                            label={
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        fontWeight: col === 'id' ? 'bold' : 'normal',
                                        fontSize: 13,
                                        opacity: columnConfig[activeFile]?.[col] === false ? 0.6 : 1
                                    }}
                                    noWrap
                                    title={col}
                                >
                                    {col}
                                </Typography>
                            }
                            sx={{ width: '100%', ml: 0.5, mr: 0, '&:hover': { bgcolor: 'action.hover', borderRadius: 1 } }}
                          />
                      ))}
                  </Box>
                  <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                      <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                          {allColumns.filter(c => columnConfig[activeFile]?.[c] !== false).length} columns active
                      </Typography>
                  </Box>
              </Paper>
           </Box>
        </Box>
      </Box>
    </Box>
  );
};
