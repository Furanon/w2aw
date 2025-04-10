// This file adds TypeScript types for Sonner toast library

declare module 'sonner' {
  import { ReactNode } from 'react';

  export type ToastPosition = 
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';

  export type ToastType = 
    | 'normal'
    | 'success'
    | 'error'
    | 'info'
    | 'warning'
    | 'loading';

  export interface ToastActionOptions {
    label: string;
    onClick: () => void;
  }
  
  export interface ToastCancelOptions {
    label: string;
    onClick?: () => void;
  }

  export interface ToastOptions {
    id?: string | number;
    icon?: ReactNode;
    duration?: number;
    className?: string;
    descriptionClassName?: string;
    action?: ToastActionOptions;
    cancel?: ToastCancelOptions;
    onDismiss?: () => void;
    onAutoClose?: () => void;
    position?: ToastPosition;
    description?: ReactNode;
    dismissible?: boolean;
    important?: boolean;
  }

  export interface ToasterProps {
    position?: ToastPosition;
    hotkey?: string[];
    expand?: boolean;
    duration?: number;
    visibleToasts?: number;
    closeButton?: boolean;
    className?: string;
    containerClassName?: string;
    toastOptions?: ToastOptions;
    gap?: number;
    offset?: string | number;
    dir?: 'rtl' | 'ltr' | 'auto';
    invert?: boolean;
    theme?: 'light' | 'dark' | 'system';
    richColors?: boolean;
  }

  export interface ToastPromiseOptions {
    loading: ReactNode;
    success: ReactNode;
    error: ReactNode;
  }

  export function toast(message: ReactNode, options?: ToastOptions): string | number;
  export namespace toast {
    export function success(message: ReactNode, options?: ToastOptions): string | number;
    export function error(message: ReactNode, options?: ToastOptions): string | number;
    export function warning(message: ReactNode, options?: ToastOptions): string | number;
    export function info(message: ReactNode, options?: ToastOptions): string | number;
    export function loading(message: ReactNode, options?: ToastOptions): string | number;
    export function promise<T>(
      promise: Promise<T>, 
      options?: ToastPromiseOptions
    ): Promise<T>;
    export function dismiss(toastId?: string | number): void;
    export function custom(message: ReactNode, options?: ToastOptions): string | number;
    export function message(message: ReactNode, options?: ToastOptions): string | number;
    export function position(position: ToastPosition): void;
  }

  export function Toaster(props?: ToasterProps): JSX.Element;
}

