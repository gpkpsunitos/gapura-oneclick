/**
 * @file
 * 
 * File ini berisi komponen Tooltip dari Shadcn UI berdasarkan Radix UI
 * Menyediakan tooltip yang muncul saat hover atau focus pada elemen
 */

"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

/**
 * Provider untuk konteks tooltip
 * Mengaktifkan tooltip dalam subtree komponen
 * @type {typeof TooltipPrimitive.Provider}
 */
const TooltipProvider = TooltipPrimitive.Provider

/**
 * Komponen root tooltip
 * Membungkus trigger dan konten tooltip
 * @type {typeof TooltipPrimitive.Root}
 */
const Tooltip = TooltipPrimitive.Root

/**
 * Komponen trigger tooltip
 * Elemen yang memicu munculnya tooltip saat hover/focus
 * @type {typeof TooltipPrimitive.Trigger}
 */
const TooltipTrigger = TooltipPrimitive.Trigger

/**
 * Props untuk komponen TooltipContent
 * @interface TooltipContentProps
 * @extends {React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>}
 */
/**
 * Komponen konten tooltip
 * Menampilkan pesan tooltip dengan animasi dan posisi yang dapat dikonfigurasi
 * 
 * @param {TooltipContentProps} props - Props untuk konten tooltip
 * @returns {JSX.Element} Element React konten tooltip
 * 
 * @example
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger>Hover me</TooltipTrigger>
 *   <TooltipContent>
 *     <p>Required information</p>
 *   </TooltipContent>
 * </Tooltip>
 * ```
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
