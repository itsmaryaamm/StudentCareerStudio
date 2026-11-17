import { cn } from "@reactive-resume/utils/style";

type Props = {
	/** "light" is for light backgrounds (dark text), "dark" for dark backgrounds, "auto" follows the theme. */
	variant?: "light" | "dark" | "auto";
	className?: string;
};

/** The full Student Career Studio logo (icon, name and "by Maryam Imran"). Set the height with `className`. */
export function BrandWordmark({ variant = "auto", className }: Props) {
	const alt = "Student Career Studio";
	if (variant !== "auto") {
		return (
			<img
				src={`/brand/logo-horizontal${variant === "dark" ? "-dark-bg" : ""}-800.png`}
				alt={alt}
				className={cn("block h-12 w-auto", className)}
			/>
		);
	}
	return (
		<>
			<img
				src="/brand/logo-horizontal-dark-bg-800.png"
				alt={alt}
				className={cn("hidden h-12 w-auto dark:block", className)}
			/>
			<img src="/brand/logo-horizontal-800.png" alt={alt} className={cn("block h-12 w-auto dark:hidden", className)} />
		</>
	);
}
