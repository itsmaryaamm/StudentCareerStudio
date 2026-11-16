import { create } from "zustand";

const ASKED_KEY = "scs.feedback.afterLimit";

type FeedbackDialogState = {
	open: boolean;
	setOpen: (open: boolean) => void;
	/** Opens the dialog the first time this browser asks, then never again for that reason. */
	openOnce: (reason: "limit") => void;
};

export const useFeedbackDialog = create<FeedbackDialogState>((set) => ({
	open: false,
	setOpen: (open) => set({ open }),
	openOnce: (reason) => {
		const key = `${ASKED_KEY}.${reason}`;
		try {
			if (localStorage.getItem(key)) return;
			localStorage.setItem(key, "1");
		} catch {
			// Without storage it would ask every time, so don't ask.
			return;
		}
		set({ open: true });
	},
}));
