
import React from 'react';
import { DashboardStat } from '../types';
import { Box, Paper, Typography, useTheme, alpha } from '@mui/material';

interface Props {
  stats: any[]; 
}

export const DashboardStats: React.FC<Props> = ({ stats }) => {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
      {stats.map((stat, idx) => {
        // Resolve color from theme or fallback
        const colorKey = (stat.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success') || 'primary';
        const colorMain = theme.palette[colorKey]?.main || theme.palette.primary.main;
        
        return (
        <Paper 
            key={idx} 
            elevation={0}
            sx={{ 
                p: 1.5, 
                px: 2,
                borderRadius: 3, 
                border: 1, 
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'background.paper',
                height: 72, // Reduced fixed height for compactness
                transition: 'all 0.2s',
                '&:hover': {
                    borderColor: colorMain,
                    boxShadow: theme.shadows[1]
                }
            }}
        >
          <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
             <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                {stat.label}
             </Typography>
             <Typography variant="h6" fontWeight={800} noWrap sx={{ lineHeight: 1, fontSize: '1.1rem' }} title={String(stat.value)}>
                {stat.value}
             </Typography>
          </Box>
          <Box 
            sx={{ 
                p: 1, 
                borderRadius: 2, 
                bgcolor: alpha(colorMain, 0.1),
                color: colorMain,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
          >
             <stat.icon size={20} />
          </Box>
        </Paper>
      )})}
    </Box>
  );
};
