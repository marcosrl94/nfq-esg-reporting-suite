// Global type declarations
declare global {
  interface Window {
    aistudio?: {
      openSelectKey?: () => Promise<void>;
    };
  }
}

export {};
