import { useRef, useState, useEffect } from "react";
import { Box, Stack, Typography, GlobalStyles } from "@mui/material";

// --- Types ---
export type HeroStage = {
  id: string;
  type: "image" | "video";
  src: string;
  title: string;
  subtitle: string;
  endFrame?: string; // Optional end frame image
  topLayer?: string; // Optional top overlay
  textVariant: "standard" | "chaos" | "fade-zoom" | "bang" | "slide-down";
};

type ScrollVideoHeroProps = {
  stages: HeroStage[];
  onComplete?: () => void;
};

// --- Sub-Components ---

// 1. Chaos Text Component
const ChaosText = ({ text, duration }: { text: string; duration: number }) => {
  const chars = text.split("");
  const durationS = `${duration}s`;
  return (
    <span style={{ display: "inline-block" }}>
      {chars.map((char, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            animation: `chaos-in ${durationS} cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
            animationDelay: `${i * 0.05}s`,
            whiteSpace: "pre"
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
};

// 1.5 Caveat Text Component (Font Swap)
const CaveatText = ({ text, duration }: { text: string; duration: number }) => {
  const chars = text.split("");
  const durationS = `${duration}s`;
  return (
    <span style={{ display: "inline-block" }}>
      {chars.map((char, i) => (
        <span
          key={i}
          style={{
             display: "inline-block",
             animation: `font-swap ${durationS} cubic-bezier(0.25, 1, 0.5, 1) forwards`,
             animationDelay: `${i * 0.05}s`, 
             whiteSpace: "pre",
             fontFamily: '"Playfair Display", serif', // Start font
             willChange: "font-family, transform, filter"
          }}
        >
           {char}
        </span>
      ))}
    </span>
  );
}

// 2. Text Layer
const TextLayer = ({ stage, active, duration }: { stage: HeroStage; active: boolean; duration: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState(0);

  // Reset animation when triggering active
  useEffect(() => {
    if (active) {
      setKey((k) => k + 1);
    }
  }, [active, stage.id]);

  if (!active) return null;

  // Helpers for dynamic duration
  const d = `${duration}s`;
  
  const getTitleAnim = () => {
    switch (stage.textVariant) {
      case "fade-zoom":
        return { animation: `fade-zoom-in ${d} ease-out forwards` };
      case "bang": {
        const bangDur = Math.max(0.5, duration - 1.8);
        const easeIn = "cubic-bezier(0.15, 0.3, 0.75, 0.6)";
        return {
          animation: `bang-in ${bangDur}s ${easeIn} 1.8s forwards`,
          opacity: 0,
        };
      }
      case "slide-down":
        return {
          animation: `slide-down-in ${d} cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
        };
      case "standard":
      default:
        return { animation: `fade-up ${d} ease-out forwards` };
    }
  };

  const getSubtitleAnim = () => {
      // Subtitle also scales with duration, but maybe a bit faster or delayed?
      // User said "until video end". So finish at same time.
      // We'll give it the same duration but a slight delay, or just match it.
      // Let's match purely to be safe with "video end".
      const delay = duration * 0.1; // 10% delay
      const subD = duration * 0.9;
      const subDS = `${subD}s`;
      const delayS = `${delay}s`;

      if (stage.textVariant === "bang") {
         // Match title exactly for "both text" request
         const bangDur = Math.max(0.5, duration - 1.8);
         const easeIn = "cubic-bezier(0.15, 0.3, 0.75, 0.6)";
         return {
             animation: `bang-in ${bangDur}s ${easeIn} 1.8s forwards`,
             opacity: 0
         };
      }

      return { 
          animation: `fade-up ${subDS} ease-out ${delayS} forwards`, 
          opacity: 0 // Start hidden
      };
  };

  return (
    <Box
      // Include duration in key so if metadata loads late, we restart with correct timing
      key={`${stage.id}-${key}-${duration}`}
      ref={containerRef}
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      <Box sx={{ 
          textAlign: "center", 
          maxWidth: "80%", 
          color: "white", 
          textShadow: "0 4px 20px rgba(0,0,0,0.5)",
          // Shift right for bang variant
          ...(stage.textVariant === "bang" && { 
              transform: "translateX(15vw)",
              animation: active ? `slide-left-long 3.5s cubic-bezier(0.25, 1, 0.5, 1) ${duration}s forwards` : "none"
          }),
          // Stage 0 Specific: 3/4th top (bottom 70%), start from bottom, centered
          ...(stage.id === "stage-0" && {
              position: "absolute",
              bottom: "70%",
              left: 0,
              right: 0,
              margin: "auto",
              width: "100%",
              transform: "none", // Reset any default transforms if present
              animation: active ? "fade-up-stage0 1.5s ease-out 0.5s forwards" : "none",
              opacity: 0 // Start hidden
          })
      }}>
        {/* Title */}
        {stage.textVariant === "fade-zoom" ? (
            <Box sx={{ display: "grid", placeItems: "center" }}>
                {/* Layer 1: Masked & Scaling (The base animation) */}
                <Typography
                    variant="h1"
                    sx={{
                        gridArea: "1/1",
                        fontFamily: '"Playfair Display", serif',
                        fontWeight: 700,
                        fontSize: { xs: "3rem", md: "5rem", lg: "7rem" },
                        lineHeight: 1,
                        mb: 2,
                        maskImage: "linear-gradient(to bottom, black 40%, transparent 85%)",
                        WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 85%)",
                        ...getTitleAnim()
                    }}
                >
                    {stage.title}
                </Typography>
                
                {/* Layer 2: Unmasked Reveal (Fades in after video) */}
                <Typography
                    variant="h1"
                    sx={{
                        gridArea: "1/1",
                        fontFamily: '"Playfair Display", serif',
                        fontWeight: 700,
                        fontSize: { xs: "3rem", md: "5rem", lg: "7rem" },
                        lineHeight: 1,
                        mb: 2,
                        opacity: 0,
                        animation: `fade-in 2s ease-out ${d} forwards`
                    }}
                >
                    {stage.title}
                </Typography>
            </Box>
        ) : (
            <Typography
            variant="h1"
            sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: stage.textVariant === "bang" ? 700 : 700, // Ensure bold
                // "2 sizes bigger" for bang variant
                fontSize: stage.textVariant === "bang" 
                    ? { xs: "5rem", md: "7rem", lg: "9rem" } 
                    : { xs: "3rem", md: "5rem", lg: "7rem" },
                lineHeight: 1,
                mb: 2,
                ...((stage.textVariant !== "chaos") ? getTitleAnim() : {})
            }}
            >
            {stage.textVariant === "chaos" ? (
                <ChaosText text={stage.title} duration={duration} />
            ) : stage.textVariant === "bang" ? (
                // Caveat supports bold (700). We set it on parent Typography above.
                <CaveatText text={stage.title} duration={3.5} />
            ) : (
                stage.title
            )}
            </Typography>
        )}

        {/* Subtitle */}
        <Typography
          variant="h5"
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 300,
            fontSize: { xs: "1.2rem", md: "2rem" },
            ...getSubtitleAnim()
          }}
        >
          {stage.subtitle}
        </Typography>
      </Box>
    </Box>
  );
};

// 3. Stage Item (Manages Video State)
const StageItem = ({ stage, active, onVideoEnd }: { stage: HeroStage; active: boolean; onVideoEnd?: () => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState(0);

    // Sync Playback
    useEffect(() => {
        if (active && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
        } else if (!active && videoRef.current) {
            videoRef.current.pause();
        }
    }, [active]);

    // Default duration for Image is 2s (standard entry)
    const effectiveDuration = stage.type === "image" ? 2 : (duration || 2); 

    return (
        <Box
            sx={{
                position: "absolute",
                inset: 0,
                opacity: active ? 1 : 0,
                transition: "opacity 1s ease-in-out",
                zIndex: 10
            }}
        >
            {stage.type === "video" ? (
                <>
                <video
                    ref={videoRef}
                    src={stage.src}
                    muted
                    playsInline
                    // loop={false} // Default is false, strict no-repeat
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    onEnded={() => {
                        if (active && onVideoEnd) onVideoEnd();
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                </>
            ) : (
                <img
                    src={stage.src}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            )}
            
            <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.3)" }} />
            
            {/* Text Overlay (Z-index 20: Behind EndFrame for depth) */}
            <Box sx={{ position: "absolute", inset: 0, zIndex: 20, width: "100%", height: "100%", pointerEvents: "none" }}>
                 <TextLayer stage={stage} active={active} duration={effectiveDuration} />
            </Box>

            {/* End Frame Overlay (Z-index 30: Top of text) */}
            {stage.type === "video" && stage.endFrame && (
                <img 
                    src={stage.endFrame} 
                    alt="" 
                    style={{ 
                        position: "absolute", 
                        inset: 0, 
                        width: "100%", 
                        height: "100%", 
                        objectFit: "cover",
                        opacity: 0,
                        zIndex: 30, // Above text
                        pointerEvents: "none", 
                        animation: active ? `fade-in 0.1s linear ${effectiveDuration}s forwards` : "none"
                    }} 
                />
            )}

            {/* Top Layer Overlay (Z-index 50: Top of everything) */}
            {stage.topLayer && (
                 <img 
                    src={stage.topLayer}
                    alt=""
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover", // Or contain? Usually header resource overlays are full size
                        zIndex: 50,
                        pointerEvents: "none",
                        transition: "transform 1.5s ease-out, opacity 1s",
                        opacity: active ? 1 : 0,
                        transform: active ? "translateY(0)" : "translateY(20%)" // Slowly go down on exit
                    }}
                 />
            )}
        </Box>
    );
};


// --- Main Component ---
export function ScrollFrameHero(props: ScrollVideoHeroProps) {
  const [activeStage, setActiveStage] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef(0);
  
  // Define styles
  const styles = `
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    /* Chaos: Explode In Reverse (Start big/scattered -> End normal) */
    @keyframes chaos-in {
       0% { opacity: 0; transform: scale(5) translate(0, 50px); filter: blur(20px); }
       100% { opacity: 1; transform: scale(1) translate(0,0); filter: blur(0px); }
    }
    @keyframes fade-zoom-in {
      0% { opacity: 0; transform: scale(0.6); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes bang-in {
      0% { opacity: 1; transform: scale(0); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes slide-down-in {
      0% { opacity: 0; transform: translateY(-100%); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes slide-left-long {
      0% { transform: translateX(15vw); max-width: 80%; text-align: center; }
      100% { transform: translateX(-25vw); max-width: 30%; text-align: right; } 
    }
    @keyframes font-swap {
      0% { font-family: 'Playfair Display', serif; transform: scale(1); filter: blur(0); }
      30% { transform: scale(1.1); filter: blur(2px); }
      50% { font-family: 'Caveat', cursive; }
      100% { font-family: 'Caveat', cursive; transform: scale(1); filter: blur(0); }
    }
    @keyframes fade-up-stage0 {
      0% { opacity: 0; transform: translateY(60vh); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `;

  // Update canAdvance when stage changes
  useEffect(() => {
    const stage = props.stages[activeStage];
    // If it's an image, default to allowed. If video, wait for end.
    if (stage.type === "image") {
        setCanAdvance(true);
    } else {
        setCanAdvance(false);
    }
  }, [activeStage, props.stages]);

  const handleVideoEnd = () => {
      setCanAdvance(true);
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastScrollTime.current < 1000) { 
         e.preventDefault();
         return;
      }
      
      const isDown = e.deltaY > 0;
      const isUp = e.deltaY < 0;

      if (window.scrollY > 5) return; 

      if (isDown) {
        // Block forward scroll if cannot advance
        if (!canAdvance && activeStage < props.stages.length - 1) {
            e.preventDefault();
            return;
        }

        if (activeStage < props.stages.length - 1) {
          e.preventDefault();
          setActiveStage(prev => prev + 1);
          lastScrollTime.current = now;
        }
      } else if (isUp) {
        // Always allow backward scroll
        if (activeStage > 0) {
          e.preventDefault();
          setActiveStage(prev => prev - 1);
          lastScrollTime.current = now;
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [activeStage, canAdvance, props.stages.length]);

  return (
    <Box
      ref={containerRef}
      sx={{
        height: "100vh",
        width: "100%",
        position: "relative",
        bgcolor: "black",
        overflow: "hidden"
      }}
    >
      <style>{styles}</style>
      <GlobalStyles styles={{ body: { overflowX: "hidden" } }} />

      {/* Render All Stages (Preloaded/Ready) */}
      {props.stages.map((stage, index) => (
         <StageItem 
            key={stage.id} 
            stage={stage} 
            active={index === activeStage} 
            onVideoEnd={handleVideoEnd}
         />
      ))}
      
      {/* Indicators */}
      <Stack 
        spacing={2} 
        sx={{ 
            position: "absolute", 
            right: 40, 
            top: "50%", 
            transform: "translateY(-50%)", 
            zIndex: 50 
        }}
      >
        {props.stages.map((_, i) => (
            <Box 
                key={i}
                onClick={() => setActiveStage(i)}
                sx={{
                    width: 4,
                    height: 40,
                    bgcolor: "white",
                    opacity: i === activeStage ? 1 : 0.3,
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    "&:hover": { opacity: 0.8 }
                }}
            />
        ))}
      </Stack>
    </Box>
  );
}
