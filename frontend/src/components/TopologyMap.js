// src/components/TopologyMap.js
import React, { useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import { Server, Router as RouterIcon, Monitor, Network, ShieldAlert, Cpu } from 'lucide-react';

// Custom Device Node Component for React Flow
function DeviceNode({ data }) {
  const isFaulty = data.isFaulty;
  const isHealthy = data.isHealthy;

  const IconComponent = () => {
    switch (data.type) {
      case 'router': return <RouterIcon size={18} color="#38bdf8" />;
      case 'switch': return <Network size={18} color="#a78bfa" />;
      case 'server': return <Server size={18} color="#34d399" />;
      case 'firewall': return <ShieldAlert size={18} color="#fb7185" />;
      default: return <Monitor size={18} color="#94a3b8" />;
    }
  };

  return (
    <div className={`flow-device-node ${isFaulty ? 'faulty' : isHealthy ? 'healthy' : ''}`}>
      <Handle type="target" position={Position.Left} style={{ background: '#38bdf8' }} />
      <div className="flow-node-title">
        <IconComponent />
        <span>{data.label}</span>
      </div>
      {data.ip && <div className="flow-node-subtitle">{data.ip}</div>}
      {data.role && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 2 }}>{data.role}</div>}
      {isFaulty && (
        <div style={{
          marginTop: 6,
          fontSize: '10px',
          fontWeight: 700,
          color: '#ef4444',
          background: 'rgba(239, 68, 68, 0.15)',
          padding: '2px 6px',
          borderRadius: 4,
          textAlign: 'center'
        }}>
          SUSPECTED FAULT
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#38bdf8' }} />
    </div>
  );
}

const nodeTypes = {
  device: DeviceNode,
};

export default function TopologyMap({ topologyNotes, conceptTag, osiLayer, diagnosis }) {
  const [viewMode, setViewMode] = useState('diagram'); // 'diagram' | 'text'

  const { nodes, edges } = useMemo(() => {
    const isL2 = osiLayer?.includes('2') || ['VLAN', 'Trunking', 'Switchport', 'STP'].includes(conceptTag);
    const isL3 = osiLayer?.includes('3') || ['Routing', 'Gateway', 'NAT', 'DHCP'].includes(conceptTag);
    const isL4 = osiLayer?.includes('4') || conceptTag === 'ACL';

    // Extract IP addresses mentioned
    const ipMatches = topologyNotes?.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) || [];
    const clientIp = ipMatches[0] || '192.168.10.10';
    const gwIp = ipMatches[1] || '192.168.10.1';
    const serverIp = ipMatches[2] || '10.0.0.5';

    // Infer devices
    const deviceNodes = [];
    const deviceEdges = [];

    // 1. Client / Host
    deviceNodes.push({
      id: 'pc1',
      type: 'device',
      position: { x: 30, y: 130 },
      data: {
        label: 'PC1 (Client)',
        type: 'pc',
        ip: clientIp,
        role: 'VLAN 10 Access Host',
        isFaulty: false,
      },
    });

    // 2. Switch
    const switchFaulty = isL2 && diagnosis != null;
    deviceNodes.push({
      id: 'sw1',
      type: 'device',
      position: { x: 260, y: 130 },
      data: {
        label: 'Switch (SW1)',
        type: 'switch',
        ip: 'VLAN 10 / Fa0/1',
        role: 'Access Switch',
        isFaulty: switchFaulty,
      },
    });

    // 3. Router / Gateway
    const routerFaulty = (isL3 || isL4) && diagnosis != null;
    deviceNodes.push({
      id: 'r1',
      type: 'device',
      position: { x: 500, y: 130 },
      data: {
        label: 'Router (R1)',
        type: 'router',
        ip: gwIp,
        role: isL4 ? 'Gateway & ACL Engine' : 'Default Gateway',
        isFaulty: routerFaulty,
      },
    });

    // 4. Remote Server / Internet
    deviceNodes.push({
      id: 'srv1',
      type: 'device',
      position: { x: 740, y: 130 },
      data: {
        label: conceptTag === 'NAT' ? 'Internet (ISP)' : 'Remote Server',
        type: conceptTag === 'NAT' ? 'firewall' : 'server',
        ip: serverIp,
        role: 'Target Endpoint',
        isFaulty: false,
      },
    });

    // Edges
    deviceEdges.push({
      id: 'e-pc-sw',
      source: 'pc1',
      target: 'sw1',
      animated: true,
      style: { stroke: switchFaulty ? '#ef4444' : '#38bdf8', strokeWidth: 2 },
      label: 'Fa0/1',
      labelStyle: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
    });

    deviceEdges.push({
      id: 'e-sw-r1',
      source: 'sw1',
      target: 'r1',
      animated: true,
      style: { stroke: routerFaulty ? '#f59e0b' : '#38bdf8', strokeWidth: 2 },
      label: 'Trunk / G0/1',
      labelStyle: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
    });

    deviceEdges.push({
      id: 'e-r1-srv',
      source: 'r1',
      target: 'srv1',
      animated: !routerFaulty,
      style: {
        stroke: routerFaulty ? '#ef4444' : '#10b981',
        strokeWidth: 2,
        strokeDasharray: routerFaulty ? '5 5' : undefined,
      },
      label: conceptTag === 'ACL' ? 'Traffic Blocked by ACL' : 'G0/2 Segment',
      labelStyle: { fill: routerFaulty ? '#ef4444' : '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: routerFaulty ? '#ef4444' : '#10b981',
      },
    });

    return { nodes: deviceNodes, edges: deviceEdges };
  }, [topologyNotes, conceptTag, osiLayer, diagnosis]);

  return (
    <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={18} color="#38bdf8" />
          <h3 style={{ margin: 0, fontSize: '15px' }}>Interactive Lab Topology Map</h3>
          <span className="badge pending" style={{ fontSize: '11px' }}>React Flow Powered</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={`btn ${viewMode === 'diagram' ? '' : 'secondary'}`}
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => setViewMode('diagram')}
          >
            Diagram View
          </button>
          <button
            className={`btn ${viewMode === 'text' ? '' : 'secondary'}`}
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => setViewMode('text')}
          >
            Text Notes
          </button>
        </div>
      </div>

      {viewMode === 'diagram' ? (
        <div className="topology-container">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            panOnDrag
            zoomOnScroll={false}
          >
            <Background color="#1e293b" gap={16} size={1} />
            <Controls showInteractive={false} position="top-right" />
          </ReactFlow>
        </div>
      ) : (
        <div style={{
          background: '#080d1a',
          padding: 16,
          borderRadius: 8,
          border: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#cbd5e1',
          whiteSpace: 'pre-wrap'
        }}>
          {topologyNotes}
        </div>
      )}
    </div>
  );
}
