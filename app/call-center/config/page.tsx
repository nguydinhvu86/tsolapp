'use client';

import React, { useState, useEffect } from 'react';
import { getPbxConfig, savePbxConfig } from './actions';
import { Save } from 'lucide-react';

export default function PbxConfigPage() {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState({
        pbxEndpoint: '',
        pbxReportEndpoint: '',
        apiKey: '',
        domain: '',
        cacheDays: 5,
        directional: 'Disable'
    });

    useEffect(() => {
        getPbxConfig().then(res => {
            if (res) {
                setConfig({
                    pbxEndpoint: res.pbxEndpoint || '',
                    pbxReportEndpoint: res.pbxReportEndpoint || '',
                    apiKey: res.apiKey || '',
                    domain: res.domain || '',
                    cacheDays: res.cacheDays || 5,
                    directional: res.directional || 'Disable'
                });
            }
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await savePbxConfig(config);
            alert('Lưu cấu hình tổng đài thành công!');
        } catch (e: any) {
            alert('Lỗi: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>Config</h2>
                </div>
                
                <div style={{ padding: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>
                                <span style={{ color: '#ef4444' }}>*</span> PBX Endpoint
                            </label>
                            <input 
                                type="text"
                                name="pbxEndpoint"
                                value={config.pbxEndpoint}
                                onChange={handleChange}
                                placeholder="https://portal.voicecloud.vn"
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>
                                PBX Endpoint get report
                            </label>
                            <input 
                                type="text"
                                name="pbxReportEndpoint"
                                value={config.pbxReportEndpoint}
                                onChange={handleChange}
                                placeholder="http://103.245.251.97"
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>
                                <span style={{ color: '#ef4444' }}>*</span> Key
                            </label>
                            <input 
                                type="text"
                                name="apiKey"
                                value={config.apiKey}
                                onChange={handleChange}
                                placeholder="Nhập API Key"
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>
                                <span style={{ color: '#ef4444' }}>*</span> Domain
                            </label>
                            <input 
                                type="text"
                                name="domain"
                                value={config.domain}
                                onChange={handleChange}
                                placeholder="trinhgia.incall.vn"
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>
                                Số ngày ghi nhớ định tuyến (Cache days)
                            </label>
                            <input 
                                type="number"
                                name="cacheDays"
                                value={config.cacheDays}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>
                                Directional
                            </label>
                            <select 
                                name="directional"
                                value={config.directional}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', backgroundColor: '#f8fafc' }}
                            >
                                <option value="Disable">Disable</option>
                                <option value="Enable">Enable</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
                        <button 
                            onClick={handleSave}
                            disabled={loading}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 24px', backgroundColor: '#0ea5e9', color: 'white', 
                                border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', 
                                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
                            }}
                        >
                            <Save size={18} /> {loading ? 'Đang lưu...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
