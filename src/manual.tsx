import React from 'react';
import { Box, Title } from '@mantine/core';

function Manual() {
  return (
    // Box maintains your standard app layout height and padding
    <Box p="md" h="95svh" display="flex" style={{ flexDirection: 'column' }}>
      
      <Title order={3} mb="sm">User Manual</Title>

      {/* The iframe is the magic window that displays your PDF */}
      <iframe 
        src="/manual.pdf#zoom=65"  
        width="100%" 
        height="100%" 
        style={{ 
            border: '2px solid #eee', 
            borderRadius: '8px',
            flexGrow: 1 
        }}
        title="System User Manual"
      />

    </Box>
  );
}

export default Manual;