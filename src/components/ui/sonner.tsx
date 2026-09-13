import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="light"
      className="toaster"
      toastOptions={{
        classNames: {
          toast: "bg-surface text-ink border-border shadow-md",
        },
      }}
    />
  );
}
