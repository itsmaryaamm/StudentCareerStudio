import { cn } from "@reactive-resume/utils/style";

type Props = {
	/** "light" is for light backgrounds (dark text), "dark" for dark backgrounds, "auto" follows the theme. */
	variant?: "light" | "dark" | "auto";
	className?: string;
};

/** The full Student Career Studio logo: the icon, the name and "by Maryam Imran". Set the height with `className`. */
export function BrandWordmark({ variant = "auto", className }: Props) {
	const alt = "Student Career Studio";
	if (variant !== "auto") {
		return <img src={`/logo/wordmark-${variant}.svg`} alt={alt} className={cn("block h-12 w-auto", className)} />;
	}
	return (
		<>
			<img src="/logo/wordmark-dark.svg" alt={alt} className={cn("hidden h-12 w-auto dark:block", className)} />
			<img src="/logo/wordmark-light.svg" alt={alt} className={cn("block h-12 w-auto dark:hidden", className)} />
		</>
	);
}
