import { cn } from "@reactive-resume/utils/style";

type Props = React.ComponentProps<"img"> & {
	variant?: "logo" | "icon";
};

export function BrandIcon({ variant = "logo", className, ...props }: Props) {
	return (
		<>
			<img
				src={`/${variant}/dark.svg?v=2`}
				alt="Student Career Studio"
				className={cn("hidden size-12 dark:block", className)}
				{...props}
			/>
			<img
				src={`/${variant}/light.svg?v=2`}
				alt="Student Career Studio"
				className={cn("block size-12 dark:hidden", className)}
				{...props}
			/>
		</>
	);
}
