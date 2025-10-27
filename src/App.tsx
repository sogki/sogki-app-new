import LiquidBackground from "./components/LiquidBackground";
import { Navbar } from "./components/Navbar";
import { ScrollToTop } from "./components/ScrollToTop";
import { Hero } from "./components/Hero";
import { Projects } from "./components/Projects";
import { About } from "./components/About";
import { TechStack } from "./components/TechStack";
import { Contact } from "./components/Contact";
import Footer from "./components/Footer";
import { KanjiScrollbar } from "./components/KanjiScrollbar";

function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ height: '100%' }}>
      {/* Background Elements */}
      <div style={{ position: "fixed", inset: 0, zIndex: 10 }}>
        <LiquidBackground
          intensity="medium"
          colors={['#0a0a0a', '#1a1a2e', '#16213e', '#533483', '#7209b7']}
          speed={1.2}
        />
      </div>

      {/* Navigation */}
      <Navbar />


      {/* Main Content */}
      <div className="relative z-20">
        <section id="home">
          <Hero />
        </section>
        <section id="about">
          <About />
        </section>
        <section id="projects">
          <Projects />
        </section>
        <section id="tech-stack">
          <TechStack />
        </section>
        <section id="contact">
          <Contact />
        </section>
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Kanji Navigation */}
      <KanjiScrollbar />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
