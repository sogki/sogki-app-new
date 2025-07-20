import React from "react";
import Galaxy from "./components/GalaxyBackground";
import { Navbar } from "./components/Navbar";
import { ScrollToTop } from "./components/ScrollToTop";
import { Hero } from "./components/Hero";
import { Projects } from "./components/Projects";
import { About } from "./components/About";
import { TechStack } from "./components/TechStack";
import { Contact } from "./components/Contact";

function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background Elements */}
      <div style={{ position: "fixed", inset: 0, zIndex: 10 }}>
        <Galaxy
          mouseRepulsion={true}
          mouseInteraction={true}
          density={0.3}
          glowIntensity={0.5}
          saturation={0}
          hueShift={140}
        />
      </div>

      {/* Navigation */}
      <Navbar />

      {/* TODO: Add your custom blackhole component here!
        
        - fixed positioning (fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2)
        - z-index between 10-19 (background is 0, navbar is 50, content is 20+)
        - centered or positioned as desired
        - Consider making it interactive with mouse movement
        - Recommended size: w-96 h-96 or larger for HD effect */}

      {/* <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 w-full h-full object-cover mix-blend-screen opacity-80">
        <video
        style={{ mixBlendMode: 'screen' }}
          src="https://mswrkamyldrizwmpzfgp.supabase.co/storage/v1/object/sign/previews/blackhole.webm?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81MTk5YjNjYS03Y2EwLTRlZmItOGMxNC0xYmZjZDVhMmVmN2QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcmV2aWV3cy9ibGFja2hvbGUud2VibSIsImlhdCI6MTc1MzAwODg5MywiZXhwIjo0OTA2NjA4ODkzfQ.oDmhs8tuhd4En8INKG7Cke4q5C_NAOpXjnIP7-SGEos"
          autoPlay
          loop
          muted
          playsInline
        />
      </div> */}

      {/* Main Content */}
      <div className="relative z-20">
        <section id="home">
          <Hero />
        </section>
        <About />
        <Projects />
        <TechStack />
        <Contact />
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Footer */}
      <footer className="relative z-20 py-12 border-t border-white/20 bg-[#0a0a0a] text-gray-300">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          {/* Creator Section */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Sogki ✦ 創作者
            </h2>
            <p className="opacity-80">
              Creating digital experiences with passion, precision, and a touch
              of Japanese aesthetics.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-2">Quick Links</h3>
            <ul className="space-y-1">
              <li>
                <a href="#about" className="hover:text-white transition">
                  About
                </a>
              </li>
              <li>
                <a href="#projects" className="hover:text-white transition">
                  Projects
                </a>
              </li>
              <li>
                <a href="#skills" className="hover:text-white transition">
                  Skills
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* By Sogki */}
          <div>
            <h3 className="text-white font-semibold mb-2">By Sogki</h3>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://api.sogki.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  SogAPI
                </a>
              </li>
              <li>
                <a
                  href="https://neko-gradients.sogki.dev"
                  className="hover:text-white transition"
                >
                  NekoGradients
                </a>
              </li>
              <li>
                <a
                  href="https://neko-links.sogki.dev"
                  className="hover:text-white transition"
                >
                  NekoLinks & Anime Tracker
                </a>
              </li>
              <li>
                <a
                  href="https://neko-snippets.sogki.dev"
                  className="hover:text-white transition"
                >
                  NekoSnippets
                </a>
              </li>
              <li>
                <a
                  href="https://marlowmarketing.org"
                  className="hover:text-white transition"
                >
                  Marlow Marketing
                </a>
              </li>
              <li>
                <a
                  href="https://profilesafterdark.com"
                  className="hover:text-white transition"
                >
                  Profiles After Dark
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Philosophy Section */}
        <div className="max-w-2xl mx-auto text-center mt-12 px-4">
          {/* <p className="italic text-gray-400 mb-2">
            Inspired by Japanese aesthetics and philosophy, I believe in
            creating with intention, simplicity, and attention to detail.
          </p> */}
          <p className="text-white font-semibold">美しさは簡潔にあり</p>
          <p className="text-gray-400 text-sm">Beauty lies in simplicity.</p>
        </div>

        {/* Bottom Note */}
        <div className="mt-8 text-center text-xs text-gray-500">
          Made with{" "}
          <span aria-label="love" role="img">
            ❤️
          </span>{" "}
          and lots of{" "}
          <span aria-label="coffee" role="img">
            ☕
          </span>{" "}
          <br />
          Sogki.dev - &copy; 2025 Sogki. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default App;
