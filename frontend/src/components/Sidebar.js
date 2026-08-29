// src/components/Sidebar.js
import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h1>NetSage AI</h1>
      <nav>
        <NavLink to="/" end>Cases</NavLink>
        <NavLink to="/custom-troubleshooter">Custom Troubleshooter</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/correction-log">Responsible AI Log</NavLink>
        <NavLink to="/rule-checker">Rule Checker</NavLink>
      </nav>
    </div>
  );
}
