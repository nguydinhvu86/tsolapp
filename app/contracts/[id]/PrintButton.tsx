'use client'

export function PrintButton() {
    return (
        <div className="no-print" style={{ marginBottom: '20px', textAlign: 'right' }}>
            <button
                onClick={() => window.print()}
                style={{ padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
                In Hợp Đồng
            </button>
        </div>
    );
}
