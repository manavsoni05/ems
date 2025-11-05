// frontend/src/layouts/AppLayout.tsx
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useEffect, useState, useMemo } from 'react';
import type { ISourceOptions } from "@tsparticles/engine";
import { useTheme } from '../hooks/hooks/useTheme';
import AIChat from '../components/AIChat';

const AppLayout = () => {
  const [init, setInit] = useState(false);
  const { mode } = useTheme();

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesOptions: ISourceOptions = useMemo(
    () => ({
        background: {
            color: {
                value: mode === 'dark' ? "#0d1117" : "#F7F8FA",
            },
        },
        fpsLimit: 120,
        interactivity: {
            events: {
                onHover: {
                    enable: true,
                    mode: "repulse",
                },
            },
            modes: {
                repulse: {
                    distance: 100,
                    duration: 0.4,
                },
            },
        },
        particles: {
            color: {
                value: mode === 'dark' ? "#ffffff" : "#30363D",
            },
            links: {
                color: mode === 'dark' ? "#ffffff" : "#30363D",
                distance: 150,
                enable: true,
                opacity: 0.1,
                width: 1,
            },
            move: {
                direction: "none",
                enable: true,
                outModes: {
                    default: "bounce",
                },
                random: true,
                speed: 1,
                straight: false,
            },
            number: {
                density: {
                    enable: true,
                },
                value: 100,
            },
            opacity: {
                value: 0.1,
            },
            shape: {
                type: "circle",
            },
            size: {
                value: { min: 1, max: 3 },
            },
        },
        detectRetina: true,
    }),
    [mode],
  );

  if (!init) return null;

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <Particles id="tsparticles-app" options={particlesOptions} />
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3, md: 4 }, position: 'relative', zIndex: 2 }}>
            <Outlet />
        </Box>
        <AIChat />
    </Box>
  );
};

export default AppLayout;