import { useEffect } from "react";
import { useLocation, Routes, Route, Navigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useSiteData } from "./context/SiteDataContext";
import { getBool } from "./lib/siteContent";
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
import { PokemonCollectionPage } from "./pages/PokemonCollectionPage";
import Footer from "./components/Footer";
import { KanjiScrollbar } from "./components/KanjiScrollbar";
import { GraphicDesignPortfolio } from "./components/GraphicDesignPortfolio";
import { GraphicDesignKanjiNav } from "./components/GraphicDesignKanjiNav";
import { ImageViewerPage } from "./components/ImageViewerPage";
import { BlogListPage } from "./pages/BlogListPage";
import { BlogPostPage } from "./pages/BlogPostPage";
import { GRAPHIC_DESIGN_RESTORE_KEY, GRAPHIC_DESIGN_SCROLL_KEY } from "./utils/imageLinks";

function App() {
  const { pathname } = useLocation();
  const { siteContent } = useSiteData();

  const isGraphicDesignPage = pathname === '/graphic-design';
  const isImageViewerPage = pathname === '/image-viewer';
  const isCollectionPage = pathname === '/collection';
  const isBlogPage = pathname === '/blog' || pathname.startsWith('/blog/');
  const isSpecialPage = isGraphicDesignPage || isImageViewerPage || isBlogPage || isCollectionPage;

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
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
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
          ) : isCollectionPage ? (
            getBool(siteContent, 'feature.show_collection', true) ? (
              <PokemonCollectionPage />
            ) : (
              <Navigate to="/" replace />
            )
          ) : isBlogPage ? (
            <Routes>
              <Route path="/blog" element={<BlogListPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
            </Routes>
          ) : (
            <>
              {getBool(siteContent, 'feature.show_hero', true) && (
                <section id="home">
                  <Hero />
                </section>
              )}
              {getBool(siteContent, 'feature.show_about', true) && (
                <section id="about">
                  <About />
                </section>
              )}
              {getBool(siteContent, 'feature.show_features', true) && (
                <section id="features">
                  <FeatureShowcase />
                </section>
              )}
              {getBool(siteContent, 'feature.show_projects', true) && (
                <section id="projects">
                  <Projects />
                </section>
              )}
              <section id="timeline">
                <Timeline />
              </section>
              <section id="tech-stack">
                <TechStack />
              </section>
              {getBool(siteContent, 'feature.show_contact', true) && (
                <section id="contact">
                  <Contact />
                </section>
              )}
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
    </MotionConfig>
  );
}

export default App;
