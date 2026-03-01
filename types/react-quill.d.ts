declare module 'react-quill' {
    import * as React from 'react';

    export interface ReactQuillProps {
        value?: string;
        defaultValue?: string;
        readOnly?: boolean;
        theme?: string;
        modules?: any;
        formats?: string[];
        bounds?: string | HTMLElement;
        placeholder?: string;
        preserveWhitespace?: boolean;
        onChange?: (content: string, delta: any, source: any, editor: any) => void;
        onChangeSelection?: (range: any, source: any, editor: any) => void;
        onFocus?: (range: any, source: any, editor: any) => void;
        onBlur?: (previousRange: any, source: any, editor: any) => void;
        onKeyPress?: React.KeyboardEventHandler<any>;
        onKeyDown?: React.KeyboardEventHandler<any>;
        onKeyUp?: React.KeyboardEventHandler<any>;
        className?: string;
        style?: React.CSSProperties;
    }

    export default class ReactQuill extends React.Component<ReactQuillProps> { }
}
