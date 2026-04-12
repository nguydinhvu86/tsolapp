declare module 'frappe-gantt' {
    export default class Gantt {
        constructor(element: string | HTMLElement, tasks: any[], options?: any);
        change_view_mode(mode: string): void;
        refresh(tasks: any[]): void;
    }
}
