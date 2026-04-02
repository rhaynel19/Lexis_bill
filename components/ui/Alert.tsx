import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 [&>svg~*]:pl-8 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground transition-all flex flex-col md:flex-row shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        info: "border-blue-200/50 text-blue-800 bg-blue-50/50 dark:border-blue-900/50 dark:text-blue-200 dark:bg-blue-950/20 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
        error: "border-red-200/50 text-red-800 bg-red-50/50 dark:border-red-900/50 dark:text-red-200 dark:bg-red-950/20 [&>svg]:text-red-600 dark:[&>svg]:text-red-400",
        success: "border-green-200/50 text-green-800 bg-green-50/50 dark:border-green-900/50 dark:text-green-200 dark:bg-green-950/20 [&>svg]:text-green-600 dark:[&>svg]:text-green-400",
        warning: "border-amber-200/50 text-amber-800 bg-amber-50/50 dark:border-amber-900/50 dark:text-amber-200 dark:bg-amber-950/20 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
      },
      size: {
        default: "p-4",
        sm: "p-3 text-sm [&>svg]:top-3 [&>svg]:left-3 [&>svg~*]:pl-7",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    },
  }
)

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
        icon?: boolean;
    }

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, size, icon = true, children, ...props }, ref) => {
    
    const IconComponent = 
        variant === "error" ? AlertCircle : 
        variant === "success" ? CheckCircle2 : 
        variant === "warning" ? AlertTriangle : 
        Info;

    return (
        <div
            ref={ref}
            role="alert"
            className={cn(alertVariants({ variant, size }), className)}
            {...props}
        >
        {icon && <IconComponent className="h-5 w-5 shrink-0" />}
        <div className="flex-1 w-full">{children}</div>
        </div>
    )
  }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed opacity-90", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription, alertVariants }
