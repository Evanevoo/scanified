import React from 'react';

export default function MinimalTest() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
      <h1>Minimal Test Component</h1>
      <p>If you can see this, React is working.</p>
      <button onClick={() => alert('Button works!')}>Test Button</button>
    </div>
  );
}
