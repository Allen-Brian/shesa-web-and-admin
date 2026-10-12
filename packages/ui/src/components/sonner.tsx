'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

import { useTheme } from './theme-provider';

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

/**
 * Shesa-themed Sonner Toaster. Reads the app's resolved theme so light-mode
 * toasts render on the light card surface instead of Sonner's default dark
 * pane (which was the "toast appears black in light mode" bug). Consumers
 * may still override `theme`/`position`/etc. via props.
 */
function Toaster({
  position = 'top-right',
  richColors = true,
  closeButton = true,
  toastOptions,
  ...props
}: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      position={position}
      richColors={richColors}
      closeButton={closeButton}
      theme={resolvedTheme}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:[background-image:var(--gradient-primary)] group-[.toast]:text-white',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
        ...toastOptions,
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
