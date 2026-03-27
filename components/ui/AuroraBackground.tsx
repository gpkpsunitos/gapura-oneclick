/**
 * AuroraBackground - Animated gradient mesh background
 * Reusable component for dashboard pages
 * Complexity: Time O(1) | Space O(1)
 */
export function AuroraBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none z-[-1]">
            <div 
                className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full mix-blend-multiply opacity-70 animate-blob" 
            />
            <div 
                className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400/20 blur-[120px] rounded-full mix-blend-multiply opacity-70 animate-blob animation-delay-2000" 
            />
            <div 
                className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-purple-400/20 blur-[120px] rounded-full mix-blend-multiply opacity-70 animate-blob animation-delay-4000" 
            />
        </div>
    );
}
