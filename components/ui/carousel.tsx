/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi komponen carousel dari embla-carousel untuk tampilan slide
 */

"use client"

import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Tipe API carousel
 * @type {UseEmblaCarouselType[1]} CarouselApi
 */
type CarouselApi = UseEmblaCarouselType[1]

/**
 * Parameter untuk hook useEmblaCarousel
 * @type {Parameters<typeof useEmblaCarousel>} UseCarouselParameters
 */
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>

/**
 * Parameter pertama untuk hook useEmblaCarousel
 * @type {UseCarouselParameters[0]} CarouselOptions
 */
type CarouselOptions = UseCarouselParameters[0]

/**
 * Parameter kedua untuk hook useEmblaCarousel (plugins)
 * @type {UseCarouselParameters[1]} CarouselPlugin
 */
type CarouselPlugin = UseCarouselParameters[1]

/**
 * Props untuk komponen Carousel
 * @interface CarouselProps
 * @property {CarouselOptions} [opts] - Opsi carousel
 * @property {CarouselPlugin} [plugins] - Plugin carousel
 * @property {"horizontal" | "vertical"} [orientation="horizontal"] - Orientasi carousel
 * @property {(api: CarouselApi) => void} [setApi] - Fungsi untuk mengatur API carousel
 */
type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

/**
 * Props konteks carousel
 * @interface CarouselContextProps
 * @property {ReturnType<typeof useEmblaCarousel>[0]} carouselRef - Ref carousel
 * @property {ReturnType<typeof useEmblaCarousel>[1]} api - API carousel
 * @property {() => void} scrollPrev - Fungsi scroll ke belakang
 * @property {() => void} scrollNext - Fungsi scroll ke depan
 * @property {boolean} canScrollPrev - Apakah bisa scroll ke belakang
 * @property {boolean} canScrollNext - Apakah bisa scroll ke depan
 * @extends CarouselProps
 */
type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

/**
 * Konteks carousel untuk hook
 * @constant {React.Context<CarouselContextProps | null>} CarouselContext
 */
const CarouselContext = React.createContext<CarouselContextProps | null>(null)

/**
 * Hook untuk mengakses konteks carousel
 * @function useCarousel
 * @returns {CarouselContextProps} Konteks carousel
 * @throws {Error} Error jika dipanggil di luar Carousel
 */
function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

/**
 * Komponen Carousel utama
 * Menampilkan carousel dengan dukungan horizontal/vertical dan navigasi keyboard
 * 
 * @param {CarouselProps} props - Props untuk konfigurasi carousel
 * @returns {JSX.Element} Element React yang berisi carousel
 * 
 * @example
 * ```tsx
 * <Carousel
 *   opts={{ loop: true }}
 *   plugins={[emblaCarouselAutoplay()]}
 *   orientation="horizontal"
 * >
 *   <CarouselContent>
 *     <CarouselItem>Item 1</CarouselItem>
 *     <CarouselItem>Item 2</CarouselItem>
 *   </CarouselContent>
 *   <CarouselPrevious />
 *   <CarouselNext />
 * </Carousel>
 * ```
 */
const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      plugins,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins
    )
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(false)

    /**
     * Menangani pemilihan slide
     * @function onSelect
     * @param {CarouselApi} api - API carousel
     * @returns {void}
     */
    const onSelect = React.useCallback((api: CarouselApi) => {
      if (!api) {
        return
      }

      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
    }, [])

    /**
     * Scroll ke slide sebelumnya
     * @function scrollPrev
     * @returns {void}
     */
    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev()
    }, [api])

    /**
     * Scroll ke slide berikutnya
     * @function scrollNext
     * @returns {void}
     */
    const scrollNext = React.useCallback(() => {
      api?.scrollNext()
    }, [api])

    /**
     * Menangani keyboard navigation
     * @function handleKeyDown
     * @param {React.KeyboardEvent<HTMLDivElement>} event - Event keyboard
     * @returns {void}
     */
    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          scrollPrev()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          scrollNext()
        }
      },
      [scrollPrev, scrollNext]
    )

    React.useEffect(() => {
      if (!api || !setApi) {
        return
      }

      setApi(api)
    }, [api, setApi])

    React.useEffect(() => {
      if (!api) {
        return
      }

      onSelect(api)
      api.on("reInit", onSelect)
      api.on("select", onSelect)

      return () => {
        api?.off("select", onSelect)
      }
    }, [api, onSelect])

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api,
          opts,
          orientation:
            orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  }
)
Carousel.displayName = "Carousel"

/**
 * Komponen CarouselContent
 * Menampilkan konten carousel dengan overflow hidden
 * 
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Props elemen div
 * @returns {JSX.Element} Element React yang berisi konten carousel
 */
const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
})
CarouselContent.displayName = "CarouselContent"

/**
 * Komponen CarouselItem
 * Menampilkan item carousel
 * 
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Props elemen div
 * @returns {JSX.Element} Element React yang berisi item carousel
 */
const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
})
CarouselItem.displayName = "CarouselItem"

/**
 * Komponen tombol carousel sebelumnya
 * Menampilkan tombol navigasi ke slide sebelumnya
 * 
 * @param {React.ComponentProps<typeof Button>} props - Props komponen Button
 * @returns {JSX.Element} Element React yang berisi tombol sebelumnya
 */
const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute  h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "-left-12 top-1/2 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
})
CarouselPrevious.displayName = "CarouselPrevious"

/**
 * Komponen tombol carousel selanjutnya
 * Menampilkan tombol navigasi ke slide selanjutnya
 * 
 * @param {React.ComponentProps<typeof Button>} props - Props komponen Button
 * @returns {JSX.Element} Element React yang berisi tombol selanjutnya
 */
const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "-right-12 top-1/2 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
})
CarouselNext.displayName = "CarouselNext"

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
