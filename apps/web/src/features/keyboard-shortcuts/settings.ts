import { create } from "zustand/react";

const storageKey = "character-shortcuts";
type ShortcutSettings = { characterShortcuts: boolean; setCharacterShortcuts: (enabled: boolean) => void };

export const useShortcutSettings = create<ShortcutSettings>((set) => ({
	// Student Career Studio ships without single-key shortcuts.
	characterShortcuts: false,
	setCharacterShortcuts: (enabled) => {
		set({ characterShortcuts: enabled });
		try {
			localStorage.setItem(storageKey, enabled ? "on" : "off");
		} catch {
			// Storage may be unavailable; the setting still applies for this session.
		}
	},
}));
