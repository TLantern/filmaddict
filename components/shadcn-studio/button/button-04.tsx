import { ArrowRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ButtonIconHoverProps {
  children?: React.ReactNode
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const ButtonIconHoverDemo = ({ 
  children = "Get In Touch", 
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props 
}: ButtonIconHoverProps & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <Button 
      className={`group ${className || ''}`}
      variant={variant}
      size={size}
      asChild={asChild}
      {...props}
    >
      {children}
      <ArrowRightIcon className='transition-transform duration-200 group-hover:translate-x-0.5' />
    </Button>
  )
}

export default ButtonIconHoverDemo

