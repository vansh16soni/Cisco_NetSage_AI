// src/components/Toast.js
import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function Toast() {
  const { toast } = useAppContext();
  if (!toast) return null;
  return <div className="toast">{toast.message}</div>;
}
