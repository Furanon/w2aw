
import * as React from "react";
import { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { AnimatedContainer } from "./animated-container";
import { Button } from "./button";
import { motion } from "framer-motion";
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X, 
  RefreshCw, 
  HelpCircle,
  ExternalLink
} from "lucide-react";

export interface EnhancedAlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "content"> {
  /**
   * Alert variant that determines the visual style
   */
  variant?: "default" | "destructive" | "warning" | "success" | "info";
  
  /**
   * Main alert title
   */
  title?: React.ReactNode;
  
  /**
   * Alert content/description
   */
  content?: React.ReactNode;
  
  /**
   * Whether the alert can be dismissed
   */
  dismissible?: boolean;
  
  /**
   * Whether the alert auto-dismisses after a delay
   */
  autoDismiss?: boolean;
  
  /**
   * Auto-dismiss timeout in milliseconds
   */
  autoDismissTimeout?: number;
  
  /**
   * Callback when the alert is dismissed
   */
  onDismiss?: () => void;
  
  /**
   * Whether to show an action button
   */
  showAction?: boolean;
  
  /**
   * Action button label
   */
  actionLabel?: string;
  
  /**
   * Callback when the action button is clicked
   */
  onAction?: () => void;
  
  /**
   * Whether the alert supports a retry action
   */
  showRetry?: boolean;
  
  /**
   * Retry button label
   */
  retryLabel?: string;
  
  /**
   * Callback when the retry button is clicked
   */
  onRetry?: () => void;
  
  /**
   * Whether the alert is currently in a loading state
   */
  isLoading?: boolean;
  
  /**
   * Whether to show a help icon with additional info
   */
  showHelp?: boolean;
  
  /**
   * Help text to show when the help icon is hovered
   */
  helpText?: string;
  
  /**
   * URL to navigate to for more information
   */
  learnMoreUrl?: string;
  
  /**
   * Learn more link text
   */
  learnMoreText?: string;
  
  /**
   * Whether to animate the alert when it appears
   */
  animate?: boolean;
  
  /**
   * Animation type to use for the alert
   */
  animationType?: "fade" | "slide" | "scale" | "bounce";
}

/**
 * Enhanced alert component with improved UI/UX features
 * Provides animations, actions, and a more comprehensive alert experience
 */
export const EnhancedAlert = React.forwardRef<HTMLDivElement, EnhancedAlertProps>(
  ({
    variant = "default",
    title,
    content,
    dismissible = true,
    autoDismiss = false,
    autoDismissTimeout = 5000,
    onDismiss,
    showAction = false,
    actionLabel = "Action",
    onAction,
    showRetry = false,
    retryLabel = "Retry",
    onRetry,
    isLoading = false,
    showHelp = false,
    helpText,
    learnMoreUrl,
    learnMoreText = "Learn more",
    animate = true,
    animationType = "fade",
    className,
    ...props
  }, ref) => {
    // State to control alert visibility
    const [isVisible, setIsVisible] = React.useState(true);
    const [isHelpVisible, setIsHelpVisible] = React.useState(false);
    
    // Handle auto-dismiss
    React.useEffect(() => {
      if (autoDismiss && isVisible) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoDismissTimeout);
        
        return () => clearTimeout(timer);
      }
    }, [autoDismiss, autoDismissTimeout, isVisible]);
    
    // Handle dismiss action
    const handleDismiss = () => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    };
    
    // Alert icon based on variant
    const AlertIcon = React.useMemo(() => {
      switch (variant) {
        case "destructive":
          return AlertCircle;
        case "warning":
          return AlertTriangle;
        case "success":
          return CheckCircle;
        case "info":
          return Info;
        default:
          return AlertCircle;
      }
    }, [variant]);
    
    // Alert variant class
    const variantClass = React.useMemo(() => {
      switch (variant) {
        case "destructive":
          return "bg-red-50 border-red-500 text-red-700 dark:bg-red-900/20 dark:border-red-600 dark:text-red-400";
        case "warning":
          return "bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-900/20 dark:border-amber-600 dark:text-amber-400";
        case "success":
          return "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-600 dark:text-green-400";
        case "info":
          return "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-400";
        default:
          return "bg-background border-muted text-foreground dark:bg-background/80 dark:border-muted/50";
      }
    }, [variant]);
    
    // Animation variants based on type
    const animationConfig = React.useMemo(() => {
      switch (animationType) {
        case "slide":
          return { type: "slide", direction: "up", duration: 0.3 };
        case "scale":
          return { type: "scale", duration: 0.3 };
        case "bounce":
          return { 
            type: "spring", 
            stiffness: 300, 
            damping: 15,
            duration: 0.5
          };
        case "fade":
        default:
          return { type: "fade", duration: 0.3 };
      }
    }, [animationType]);
    
    return (
      <AnimatedContainer
        isVisible={isVisible}
        animationConfig={animate ? animationConfig : undefined}
        className="relative"
        onExitComplete={() => onDismiss && onDismiss()}
      >
        <Alert 
          ref={ref}
          variant={variant === "warning" || variant === "info" || variant === "success" ? "default" : variant}
          className={cn(
            "relative border-l-4 shadow-sm",
            variantClass,
            className
          )}
          {...props}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              <AlertIcon className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              {title && <AlertTitle className="font-semibold mb-1">{title}</AlertTitle>}
              
              {content && (
                <AlertDescription>
                  {content}
                  
                  {learnMoreUrl && (
                    <a 
                      href={learnMoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center mt-1 text-sm font-medium underline"
                    >
                      {learnMoreText}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  )}
                </AlertDescription>
              )}
              
              {/* Alert actions */}
              {(showAction || showRetry) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {showAction && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onAction}
                      disabled={isLoading}
                    >
                      {actionLabel}
                    </Button>
                  )}
                  
                  {showRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onRetry}
                      disabled={isLoading}
                      className="flex items-center"
                    >
                      <RefreshCw className={cn(
                        "mr-1 h-3 w-3",
                        isLoading && "animate-spin"
                      )} />
                      {retryLabel}
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {/* Help icon */}
            {showHelp && helpText && (
              <div className="relative ml-2">
                <div
                  className="cursor-help"
                  onMouseEnter={() => setIsHelpVisible(true)}
                  onMouseLeave={() => setIsHelpVisible(false)}
                >
                  <HelpCircle className="h-4 w-4 opacity-70" />
                </div>
                
                {isHelpVisible && (
                  <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-md bg-background p-3 text-sm shadow-lg ring-1 ring-muted">
                    {helpText}
                  </div>
                )}
              </div>
            )}
            
            {/* Close button */}
            {dismissible && (
              <button 
                onClick={handleDismiss}
                className="absolute right-2 top-2 rounded-full p-1 hover:bg-muted/30 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </Alert>
      </AnimatedContainer>
    );
  }
);

EnhancedAlert.displayName = "EnhancedAlert";

export default EnhancedAlert;

