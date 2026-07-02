'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

/**
 * Academia-themed Sonner Toaster. Defaults to top-right + rich colors and
 * reads CSS tokens for surface/border/foreground so toasts inherit the
 * tenant theme. Consumers may override any prop (theme/position/etc.).
 */
function Toaster({
  position = 'top-right',
  richColors = true,
  closeButton = true,
  theme = 'system',
  toastOptions,
  ...props
}: ToasterProps) {
  return (
    <SonnerToaster
      position={position}
      richColors={richColors}
      closeButton={closeButton}
      theme={theme}
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
