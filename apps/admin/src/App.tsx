import React from 'react';
import { colors } from '@carx/ui';

export function App() {
  return (
    <div
      style={{
        backgroundColor: colors.asfalto.DEFAULT,
        minHeight: '100vh',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: colors.volt.DEFAULT, fontSize: '2rem', fontWeight: 700 }}>
          CarX Super Admin
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
          Painel de Gestão Global e Multi-tenant
        </p>
      </div>
    </div>
  );
}

export default App;

