'use client';

import { Printer } from "lucide-react";

export default function PrintButtonClient() {
    return (
        <button onClick={() => window.print()} className="px-4 py-2 border border-slate-300 shadow-sm bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
            <Printer size={16} />
            In Sao Kê
        </button>
    );
}
