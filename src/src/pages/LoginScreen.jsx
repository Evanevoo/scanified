import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else navigation.replace('ScanOrder');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoCapitalize="none" />
      <input placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type="password" />
      <button onClick={handleLogin}>Login</button>
      {error ? <span style={{ color: 'red' }}>{error}</span> : null}
    </div>
  );
} 