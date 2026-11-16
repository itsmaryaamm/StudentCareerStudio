import { create } from "zustand";

/** A page that takes the whole phone screen (the Career Lab workbook) hides the tab bar while it's open. */
export const useMobileChrome = create<{ hideTabs: boolean; setHideTabs: (hide: boolean) => void }>((set) => ({
	hideTabs: false,
	setHideTabs: (hideTabs) => set({ hideTabs }),
}));
