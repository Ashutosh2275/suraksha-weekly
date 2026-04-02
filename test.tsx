'use client';

import { useState } from 'react';

export default function TestPage() {
  const [test, setTest] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <h1>Test</h1>
    </div>
  );
}