/**
 * @file
 * 
 * File ini berisi komponen Dropdown Menu dari Shadcn UI berdasarkan Radix UI
 * Menyediakan berbagai komponen dropdown seperti menu, item, checkbox, radio, dll
 */

"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Komponen root dropdown menu
 * @type {typeof DropdownMenuPrimitive.Root}
 */
const DropdownMenu = DropdownMenuPrimitive.Root

/**
 * Komponen trigger untuk membuka dropdown menu
 * @type {typeof DropdownMenuPrimitive.Trigger}
 */
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

/**
 * Komponen untuk mengelompokkan menu items
 * @type {typeof DropdownMenuPrimitive.Group}
 */
const DropdownMenuGroup = DropdownMenuPrimitive.Group

/**
 * Komponen portal untuk dropdown menu
 * @type {typeof DropdownMenuPrimitive.Portal}
 */
const DropdownMenuPortal = DropdownMenuPrimitive.Portal

/**
 * Komponen submenu dalam dropdown
 * @type {typeof DropdownMenuPrimitive.Sub}
 */
const DropdownMenuSub = DropdownMenuPrimitive.Sub

/**
 * Komponen radio group untuk dropdown
 * @type {typeof DropdownMenuPrimitive.RadioGroup}
 */
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

/**
 * Props untuk komponen DropdownMenuSubTrigger
 * @interface DropdownMenuSubTriggerProps
 * @extends {React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger>}
 */
/**
 * Komponen trigger untuk submenu dropdown
 * Menampilkan item yang dapat diklik untuk membuka submenu dengan indikator panah
 * 
 * @param {DropdownMenuSubTriggerProps} props - Props untuk trigger submenu
 * @returns {JSX.Element} Element React trigger submenu
 */
const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    /** Indentasi kiri untuk item nested */
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

/**
 * Props untuk komponen DropdownMenuSubContent
 * @interface DropdownMenuSubContentProps
 * @extends {React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>}
 */
/**
 * Komponen konten untuk submenu dropdown
 * Menampilkan item-item dalam submenu dengan animasi
 * 
 * @param {DropdownMenuSubContentProps} props - Props untuk konten submenu
 * @returns {JSX.Element} Element React konten submenu
 */
const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

/**
 * Props untuk komponen DropdownMenuContent
 * @interface DropdownMenuContentProps
 * @extends {React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>}
 */
/**
 * Komponen konten utama dropdown menu
 * Menampilkan item-item menu dengan animasi dan dukungan portal
 * 
 * @param {DropdownMenuContentProps} props - Props untuk konten dropdown
 * @returns {JSX.Element} Element React konten dropdown
 */
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

/**
 * Props untuk komponen DropdownMenuItem
 * @interface DropdownMenuItemProps
 * @extends {React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>}
 */
/**
 * Komponen item menu dalam dropdown
 * Item yang dapat diklik dalam menu dropdown
 * 
 * @param {DropdownMenuItemProps} props - Props untuk item menu
 * @returns {JSX.Element} Element React item menu
 */
const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    /** Indentasi kiri untuk item nested */
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

/**
 * Props untuk komponen DropdownMenuCheckboxItem
 * @interface DropdownMenuCheckboxItemProps
 * @extends {React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>}
 */
/**
 * Komponen item checkbox dalam dropdown
 * Item dengan checkbox yang dapat diklik untuk toggle
 * 
 * @param {DropdownMenuCheckboxItemProps} props - Props untuk item checkbox
 * @returns {JSX.Element} Element React item checkbox
 */
const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

/**
 * Props untuk komponen DropdownMenuRadioItem
 * @interface DropdownMenuRadioItemProps
 * @extends {React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>}
 */
/**
 * Komponen item radio dalam dropdown
 * Item dengan radio button untuk pemilihan tunggal
 * 
 * @param {DropdownMenuRadioItemProps} props - Props untuk item radio
 * @returns {JSX.Element} Element React item radio
 */
const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

/**
 * Props untuk komponen DropdownMenuLabel
 * @interface DropdownMenuLabelProps
 * @extends {React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>}
 */
/**
 * Komponen label dalam dropdown
 * Menampilkan teks label non-interactive untuk mengelompokkan item
 * 
 * @param {DropdownMenuLabelProps} props - Props untuk label
 * @returns {JSX.Element} Element React label
 */
const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    /** Indentasi kiri untuk label nested */
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

/**
 * Props untuk komponen DropdownMenuSeparator
 * @interface DropdownMenuSeparatorProps
 * @extends {React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>}
 */
/**
 * Komponen pemisah dalam dropdown
 * Garis pemisah visual antar item menu
 * 
 * @param {DropdownMenuSeparatorProps} props - Props untuk separator
 * @returns {JSX.Element} Element React separator
 */
const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

/**
 * Props untuk komponen DropdownMenuShortcut
 * @interface DropdownMenuShortcutProps
 * @extends {React.HTMLAttributes<HTMLSpanElement>}
 */
/**
 * Komponen shortcut dalam dropdown
 * Menampilkan keyboard shortcut di sebelah kanan item menu
 * 
 * @param {DropdownMenuShortcutProps} props - Props untuk shortcut
 * @returns {JSX.Element} Element React shortcut
 */
const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
