'use client';
import React, { useEffect, useRef, useState } from 'react';
import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import gjsBlocksBasic from 'grapesjs-blocks-basic';

interface TemplateBuilderProps {
    initialHtml?: string;
    initialCss?: string;
    onChange: (html: string, css: string) => void;
}

export function TemplateBuilder({ initialHtml = '', initialCss = '', onChange }: TemplateBuilderProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [editor, setEditor] = useState<Editor | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;

        // Initialize GrapesJS
        const e = grapesjs.init({
            container: editorRef.current,
            fromElement: false,
            height: '700px',
            width: '100%',
            storageManager: false, // We handle storage manually via onChange
            plugins: [gjsPresetWebpage, gjsBlocksBasic],
            pluginsOpts: {
                [gjsPresetWebpage as any]: {
                    // options
                }
            },
            canvas: {
                styles: [
                    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
                    'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap'
                ],
            },
        });

        // Add custom blocks for ERP
        e.BlockManager.add('erp-text', {
            label: '<svg viewBox="0 0 24 24" class="w-6 h-6 mx-auto mb-1" fill="currentColor"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg><div>Văn bản</div>',
            category: 'Cơ bản',
            content: '<div data-gjs-type="text" style="padding: 10px; font-family: Roboto, sans-serif;">Nhập văn bản của bạn tại đây...</div>',
        });

        e.BlockManager.add('erp-section', {
            label: '<svg viewBox="0 0 24 24" class="w-6 h-6 mx-auto mb-1" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg><div>Khung/Frame</div>',
            category: 'Cơ bản',
            content: `<div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: 10px; min-height: 50px;">
                <h3 style="font-family: Roboto, sans-serif;">Tiêu đề khu vực</h3>
                <p style="font-family: Roboto, sans-serif;">Kéo thả nội dung vào đây...</p>
            </div>`,
        });

        e.BlockManager.add('erp-table', {
            label: '<svg viewBox="0 0 24 24" class="w-6 h-6 mx-auto mb-1" fill="currentColor"><path d="M20 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 2v3H5V5h15zm-5 14h-5v-9h5v9zM5 10h3v9H5v-9zm10 9v-9h5v9h-5z"/></svg><div>Bảng</div>',
            category: 'Cơ bản',
            content: `<table style="width: 100%; border-collapse: collapse; font-family: Roboto, sans-serif; margin-bottom: 15px;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #d1d5db; padding: 8px; background-color: #f3f4f6; text-align: left;">Cột 1</th>
                        <th style="border: 1px solid #d1d5db; padding: 8px; background-color: #f3f4f6; text-align: left;">Cột 2</th>
                        <th style="border: 1px solid #d1d5db; padding: 8px; background-color: #f3f4f6; text-align: right;">Cột 3</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #d1d5db; padding: 8px;">Dữ liệu 1</td>
                        <td style="border: 1px solid #d1d5db; padding: 8px;">Dữ liệu 2</td>
                        <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">0</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #d1d5db; padding: 8px;">Dữ liệu 1</td>
                        <td style="border: 1px solid #d1d5db; padding: 8px;">Dữ liệu 2</td>
                        <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">0</td>
                    </tr>
                </tbody>
            </table>`,
        });

        e.BlockManager.add('erp-variable', {
            label: '<svg viewBox="0 0 24 24" class="w-6 h-6 mx-auto mb-1" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg><div>Biến (Variable)</div>',
            category: 'Nâng cao',
            content: '<span style="color: #2563eb; font-weight: bold; font-family: Roboto, sans-serif;">{{TEN_BIEN}}</span>',
        });

        e.BlockManager.add('erp-dynamic-table', {
            label: '<svg viewBox="0 0 24 24" class="w-6 h-6 mx-auto mb-1" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg><div>Bảng Động</div>',
            category: 'Nâng cao',
            content: '<div style="margin: 15px 0; padding: 10px; background-color: #ecfdf5; border: 1px dashed #10b981; color: #047857; font-family: Roboto, sans-serif;"><strong>[BẢNG_ĐỘNG]</strong> Bảng Sản Phẩm/Thiết Bị (Gõ {{TABLE_THIETBI}})</div>',
        });

        e.BlockManager.add('erp-signature', {
            label: '<svg viewBox="0 0 24 24" class="w-6 h-6 mx-auto mb-1" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg><div>Vùng Ký Tên</div>',
            category: 'Nâng cao',
            content: `<table style="width: 100%; margin-top: 40px; font-family: Roboto, sans-serif; text-align: center;">
                <tr>
                    <td style="width: 50%;">
                        <strong>ĐẠI DIỆN BÊN A</strong><br/>
                        <em>(Ký, ghi rõ họ tên)</em><br/>
                        <br/><br/><br/><br/>
                    </td>
                    <td style="width: 50%;">
                        <strong>ĐẠI DIỆN BÊN B</strong><br/>
                        <em>(Ký, ghi rõ họ tên)</em><br/>
                        <br/><br/><br/><br/>
                    </td>
                </tr>
            </table>`
        });

        setEditor(e);

        // Load initial content
        if (initialHtml) {
            e.setComponents(initialHtml);
        }
        if (initialCss) {
            e.setStyle(initialCss);
        }

        // Listen to changes and send back to parent
        e.on('update', () => {
            const html = e.getHtml();
            const css = e.getCss();
            onChange(html, css || '');
        });

        return () => {
            if (e) {
                e.destroy();
            }
        };
    }, []);

    // Update editor if props change externally (rare, usually only on init)
    // We skip this to prevent cursor jumps while typing unless it's strictly necessary.

    return (
        <div className="template-builder-wrapper border border-gray-200 rounded-lg overflow-hidden">
            <div ref={editorRef}></div>
            <style dangerouslySetInnerHTML={{
                __html: `
        .template-builder-wrapper {
          min-height: 700px;
        }
        .gjs-cv-canvas {
          background-color: #fff;
        }
      `}} />
        </div>
    );
}
