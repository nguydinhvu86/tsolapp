import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export const metadata = {
    title: 'Đăng Ký Thông Tin',
};

export default async function PublicLeadFormPage({ params }: { params: { id: string } }) {
    const formId = params.id;

    // Fetch form config
    const leadForm = await prisma.leadForm.findUnique({
        where: { id: formId }
    });

    if (!leadForm) {
        notFound();
    }

    if (!leadForm.isActive) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' }}>
                <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'center', maxWidth: '400px' }}>
                    <h2 style={{ fontSize: '1.25rem', color: '#334155', marginBottom: '0.5rem' }}>Biểu mẫu đã đóng</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Biểu mẫu thu thập thông tin này hiện không còn nhận dữ liệu.</p>
                </div>
            </div>
        );
    }

    // Embed an HTML form that POSTs to our API
    // Using vanilla JS for submission to keep the iframe lightweight and pure HTML/JS
    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', fontFamily: 'Inter, sans-serif' }}>
            <style>{`
                .lead-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    border: 1px solid #cbd5e1;
                    outline: none;
                    font-size: 0.9375rem;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                }
                .lead-input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 1px #3b82f6;
                }
                .submit-btn {
                    width: 100%;
                    padding: 1rem;
                    background: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    margin-top: 0.5rem;
                }
                .submit-btn:hover {
                    background: #1d4ed8;
                }
                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
            `}</style>
            <div style={{ background: 'white', width: '100%', maxWidth: '480px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
                <div style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>{leadForm.title}</h1>
                </div>

                <div style={{ padding: '2rem' }} id="form-container">
                    <form id="lead-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <input type="hidden" name="formId" value={formId} />

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Họ Tên <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="text" name="name" required placeholder="Nguyễn Văn A" className="lead-input" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Số Điện Thoại <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="tel" name="phone" required placeholder="0901234567" pattern="[0-9]{10,11}" className="lead-input" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Email</label>
                            <input type="email" name="email" placeholder="email@company.com" className="lead-input" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Công ty / Đơn vị</label>
                            <input type="text" name="company" placeholder="Tên công ty..." className="lead-input" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Yêu cầu / Ghi chú <span style={{ color: '#ef4444' }}>*</span></label>
                            <textarea name="notes" required rows={4} placeholder="Anh/chị đang quan tâm đến vấn đề gì..." className="lead-input" style={{ resize: 'vertical' }}></textarea>
                        </div>

                        <button type="submit" id="submit-btn" className="submit-btn">
                            GỬI THÔNG TIN
                        </button>

                        <div id="error-message" style={{ display: 'none', color: '#dc2626', fontSize: '0.875rem', textAlign: 'center', marginTop: '0.5rem', background: '#fee2e2', padding: '0.75rem', borderRadius: '6px' }}></div>
                    </form>

                    <div id="success-message" style={{ display: 'none', textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ width: '64px', height: '64px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
                            ✓
                        </div>
                        <h2 style={{ margin: '0 0 1rem', color: '#0f172a', fontSize: '1.5rem' }}>Thành công!</h2>
                        <p style={{ color: '#475569', fontSize: '1rem', lineHeight: '1.5' }} id="success-text"></p>
                    </div>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{
                __html: `
                document.getElementById('lead-form').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const btn = document.getElementById('submit-btn');
                    const errorDiv = document.getElementById('error-message');
                    const form = e.target;
                    
                    btn.disabled = true;
                    btn.innerText = 'Đang gửi...';
                    btn.style.opacity = '0.7';
                    errorDiv.style.display = 'none';

                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());

                    try {
                        const response = await fetch('/api/leads/submit', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(data),
                        });

                        const result = await response.json();

                        if (result.success) {
                            form.style.display = 'none';
                            const successDiv = document.getElementById('success-message');
                            successDiv.style.display = 'block';
                            document.getElementById('success-text').innerText = result.message || 'Cảm ơn bạn đã để lại thông tin.';
                        } else {
                            throw new Error(result.error || 'Có lỗi xảy ra, vui lòng thử lại.');
                        }
                    } catch (error) {
                        errorDiv.innerText = error.message;
                        errorDiv.style.display = 'block';
                        btn.disabled = false;
                        btn.innerText = 'GỬI THÔNG TIN';
                        btn.style.opacity = '1';
                    }
                });
            `}} />
        </div>
    );
}
