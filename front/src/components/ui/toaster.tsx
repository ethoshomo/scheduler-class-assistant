// toaster.tsx
import { useToast } from "@/hooks/use-toast";
import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
	const { toasts } = useToast();

	return (
		<ToastProvider duration={2000}>
			{toasts.map(function ({
				id,
				title,
				description,
				action,
				...props
			}) {
				return (
					<Toast key={id} {...props}>
						<div className="grid gap-1">
							{title && <ToastTitle>{title}</ToastTitle>}
							{description && (
								<ToastDescription>
									{description}
								</ToastDescription>
							)}
						</div>
						{action}
						<ToastClose />
					</Toast>
				);
			})}
			<ToastViewport className="fixed top-0 right-0 flex flex-col gap-2 p-4 max-h-screen w-full sm:w-80" />
		</ToastProvider>
	);
}
