/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi komponen AuroraBackground untuk animasi background gradient mesh
 * Komponen reusable untuk halaman dashboard dengan efek aurora animasi
 */

/**
 * AuroraBackground - Animated gradient mesh background
 * Komponen background dengan animasi blob gradient yang memberikan efek aurora
 * Menggunakan mix-blend-multiply untuk blending warna yang natural
 * Kompleksitas: Waktu O(1) | Ruang O(1)
 * 
 * @returns {JSX.Element} Element React dengan background aurora animasi
 * 
 * @example
 * ```tsx
 * <AuroraBackground />
 * ```
 */
export function AuroraBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none z-[-1]">
            {/* Blob biru di kiri atas */}
            <div 
                className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full mix-blend-multiply opacity-70 animate-blob" 
            />
            {/* Blob hijau di kanan atas */}
            <div 
                className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400/20 blur-[120px] rounded-full mix-blend-multiply opacity-70 animate-blob animation-delay-2000" 
            />
            {/* Blob ungu di kiri bawah */}
            <div 
                className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-purple-400/20 blur-[120px] rounded-full mix-blend-multiply opacity-70 animate-blob animation-delay-4000" 
            />
        </div>
    );
}
