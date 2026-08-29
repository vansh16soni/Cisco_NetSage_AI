// src/components/Badge.js
import React from 'react';

export default function Badge({ value }) {
  const cls = (value || '').toLowerCase();
  return <span className={`badge ${cls}`}>{value}</span>;
}
