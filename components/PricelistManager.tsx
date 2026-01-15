
import React, { useState } from 'react';
import { OdooPricelist } from '../types';
import { Search, Banknote, Globe } from 'lucide-react';
import { 
    Box, Paper, Typography, TextField, InputAdornment, Table, TableBody, 
    TableCell, TableContainer, TableHead, TableRow, Chip, useTheme, alpha, Fade
} from '@mui/material';

interface Props {
    pricelists: OdooPricelist[];
}

export const PricelistManager: React.FC<Props> = ({ pricelists }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const theme = useTheme();

    const filteredList = pricelists.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.currencyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
            {/* Header */}
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
                    borderRadius: 0,
                    bgcolor: 'background.paper'
                }}
            >
                <Box>
                    <Typography variant="h5" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Banknote className="text-primary" /> Pricelists
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Manage and view your Odoo sales pricelists and currency configurations.
                    </Typography>
                </Box>

                <TextField 
                    placeholder="Search pricelists..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment>,
                    }}
                    sx={{ width: 280 }}
                />
            </Paper>

            <Box sx={{ px: 3, pb: 3, overflowY: 'auto', flex: 1 }}>
                {filteredList.length === 0 ? (
                    <Fade in>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: 'text.secondary', opacity: 0.7 }}>
                            <Banknote size={64} strokeWidth={1} style={{ marginBottom: 24, opacity: 0.5 }} />
                            <Typography variant="h5" fontWeight="bold">No pricelists found</Typography>
                            <Typography variant="body1">Ensure you are connected to Odoo and have configured pricelists.</Typography>
                        </Box>
                    </Fade>
                ) : (
                    <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'background.default' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Currency</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: 100 }}>ID</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredList.map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">{row.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                icon={<Globe size={14} />} 
                                                label={row.currencyName} 
                                                size="small" 
                                                variant="outlined" 
                                                color="primary"
                                                sx={{ borderRadius: 1 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                                                {row.id}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </Box>
    );
};
