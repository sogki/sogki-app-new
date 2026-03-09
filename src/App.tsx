import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import LiquidBackground from "./components/LiquidBackground";
import { Navbar } from "./components/Navbar";
import { ScrollToTop } from "./components/ScrollToTop";
import { ScrollProgress } from "./components/ScrollProgress";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { FeatureShowcase } from "./components/FeatureShowcase";
import { Projects } from "./components/Projects";
import { Timeline } from "./components/Timeline";
import { TechStack } from "./components/TechStack";
import { Contact } from "./components/Contact";
import Footer from "./components/Footer";
import { KanjiScrollbar } from "./components/KanjiScrollbar";
import { GraphicDesignPortfolio } from "./components/GraphicDesignPortfolio";
import { GraphicDesignKanjiNav } from "./components/GraphicDesignKanjiNav";
import { ImageViewerPage } from "./components/ImageViewerPage";
import { GRAPHIC_DESIGN_RESTORE_KEY, GRAPHIC_DESIGN_SCROLL_KEY } from "./utils/imageLinks";

function App() {
  const { pathname } = useLocation();

  const isGraphicDesignPage = pathname === '/graphic-design';
  const isImageViewerPage = pathname === '/image-viewer';
  const isSpecialPage = isGraphicDesignPage || isImageViewerPage;

  useEffect(() => {
    if (pathname !== '/graphic-design') return;

    const shouldRestore = sessionStorage.getItem(GRAPHIC_DESIGN_RESTORE_KEY) === '1';
    if (!shouldRestore) return;

    const savedScroll = Number(sessionStorage.getItem(GRAPHIC_DESIGN_SCROLL_KEY) ?? '0');
    const nextY = Number.isFinite(savedScroll) ? savedScroll : 0;

    requestAnimationFrame(() => {
      window.scrollTo({ top: nextY, behavior: 'auto' });
      sessionStorage.removeItem(GRAPHIC_DESIGN_RESTORE_KEY);
    });
  }, [pathname]);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ height: '100%' }}>
      {/* Background Elements */}
      <div style={{ position: "fixed", inset: 0, zIndex: 10 }}>
        {isSpecialPage ? (
          <div
            className="h-full w-full"
            style={{
              background:
                'radial-gradient(circle at 20% 20%, rgba(112, 9, 183, 0.16), transparent 45%), radial-gradient(circle at 80% 30%, rgba(83, 52, 131, 0.18), transparent 40%), #06060a',
            }}
          />
        ) : (
          <LiquidBackground
            intensity="medium"
            colors={['#0a0a0a', '#1a1a2e', '#16213e', '#533483', '#7209b7']}
            speed={1.2}
          />
        )}
      </div>

      {/* Scroll Progress Indicator */}
      {!isSpecialPage && <ScrollProgress />}

      {/* Navigation */}
      {!isImageViewerPage && <Navbar />}

      {/* Main Content */}
      <div className="relative z-20">
        {isImageViewerPage ? (
          <ImageViewerPage />
        ) : isGraphicDesignPage ? (
          <GraphicDesignPortfolio />
        ) : (
          <>
            <section id="home">
              <Hero />
            </section>
            <section id="about">
              <About />
            </section>
            <section id="features">
              <FeatureShowcase />
            </section>
            <section id="projects">
              <Projects />
            </section>
            <section id="timeline">
              <Timeline />
            </section>
            <section id="tech-stack">
              <TechStack />
            </section>
            <section id="contact">
              <Contact />
            </section>
          </>
        )}
      </div>

      {/* Scroll to Top Button */}
      {!isImageViewerPage && <ScrollToTop />}

      {/* Kanji Navigation */}
      {!isSpecialPage && <KanjiScrollbar />}
      {isGraphicDesignPage && <GraphicDesignKanjiNav />}

      {/* Footer */}
      {!isImageViewerPage && <Footer />}
    </div>
  );
}

export default App;
