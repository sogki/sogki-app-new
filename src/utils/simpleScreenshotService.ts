// Simple screenshot service that works without API keys
// Uses free services that don't require authentication

interface ScreenshotOptions {
  url: string;
  width?: number;
  height?: number;
}

export class SimpleScreenshotService {
  // Method 1: Using a working free service
  static generateScreenshot(options: ScreenshotOptions): string {
    const { url, width = 1200, height = 630 } = options;
    
    // Using a free screenshot service that actually works
    return `https://api.screenshotone.com/take?access_key=demo&url=${encodeURIComponent(url)}&viewport_width=${width}&viewport_height=${height}&device_scale_factor=1&format=png&full_page=false&wait_for_event=load`;
  }

  // Method 2: Using another working service
  static generateScreenshotAlternative(options: ScreenshotOptions): string {
    const { url, width = 1200, height = 630 } = options;
    
    // Using a different free service
    return `https://htmlcsstoimage.com/demo?url=${encodeURIComponent(url)}&width=${width}&height=${height}&device_scale_factor=1&format=png`;
  }

  // Method 3: Using a simple screenshot service
  static generateScreenshotFallback(options: ScreenshotOptions): string {
    const { url, width = 1200, height = 630 } = options;
    
    // Using a simple screenshot service
    return `https://shot.screenshotapi.net/screenshot?token=demo&url=${encodeURIComponent(url)}&width=${width}&height=${height}&format=png&full_page=false&file_type=png&wait_for_event=load`;
  }

  // Method 4: Create a placeholder with project info
  static generatePlaceholder(options: ScreenshotOptions): string {
    const { url, width = 1200, height = 630 } = options;
    
    // Create a data URL with project info as a placeholder
    const domain = new URL(url).hostname;
    const projectName = domain.split('.')[0];
    
    // Create a simple SVG placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <text x="50%" y="45%" text-anchor="middle" fill="#7209b7" font-family="Arial, sans-serif" font-size="48" font-weight="bold">${projectName}</text>
        <text x="50%" y="55%" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Loading Screenshot...</text>
        <text x="50%" y="70%" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">${url}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  // Method 5: Create a realistic website preview
  static generateWebsitePreview(options: ScreenshotOptions): string {
    const { url, width = 1200, height = 630 } = options;
    
    // Create a data URL with a realistic website preview
    const domain = new URL(url).hostname;
    const projectName = domain.split('.')[0];
    
    // Create a more realistic website preview SVG
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="header" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="card" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bg)"/>
        
        <!-- Header -->
        <rect x="0" y="0" width="100%" height="80" fill="url(#header)"/>
        <text x="40" y="50" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">${projectName}</text>
        
        <!-- Navigation -->
        <rect x="0" y="80" width="100%" height="60" fill="#ffffff" stroke="#e2e8f0"/>
        <text x="40" y="115" fill="#374151" font-family="Arial, sans-serif" font-size="16">Home</text>
        <text x="120" y="115" fill="#374151" font-family="Arial, sans-serif" font-size="16">About</text>
        <text x="180" y="115" fill="#374151" font-family="Arial, sans-serif" font-size="16">Projects</text>
        <text x="260" y="115" fill="#374151" font-family="Arial, sans-serif" font-size="16">Contact</text>
        
        <!-- Main content area -->
        <rect x="40" y="180" width="1120" height="400" fill="url(#card)" stroke="#e2e8f0" stroke-width="1" rx="8"/>
        
        <!-- Content text -->
        <text x="80" y="220" fill="#1f2937" font-family="Arial, sans-serif" font-size="32" font-weight="bold">Welcome to ${projectName}</text>
        <text x="80" y="260" fill="#6b7280" font-family="Arial, sans-serif" font-size="18">A modern web application built with cutting-edge technology</text>
        
        <!-- Feature cards -->
        <rect x="80" y="300" width="300" height="120" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1" rx="6"/>
        <text x="100" y="330" fill="#374151" font-family="Arial, sans-serif" font-size="16" font-weight="bold">Feature 1</text>
        <text x="100" y="350" fill="#6b7280" font-family="Arial, sans-serif" font-size="14">Modern design and user experience</text>
        
        <rect x="420" y="300" width="300" height="120" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1" rx="6"/>
        <text x="440" y="330" fill="#374151" font-family="Arial, sans-serif" font-size="16" font-weight="bold">Feature 2</text>
        <text x="440" y="350" fill="#6b7280" font-family="Arial, sans-serif" font-size="14">Responsive and mobile-friendly</text>
        
        <rect x="760" y="300" width="300" height="120" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1" rx="6"/>
        <text x="780" y="330" fill="#374151" font-family="Arial, sans-serif" font-size="16" font-weight="bold">Feature 3</text>
        <text x="780" y="350" fill="#6b7280" font-family="Arial, sans-serif" font-size="14">Fast and optimized performance</text>
        
        <!-- Footer -->
        <rect x="0" y="580" width="100%" height="50" fill="#f8fafc" stroke="#e2e8f0"/>
        <text x="40" y="610" fill="#6b7280" font-family="Arial, sans-serif" font-size="14">© 2024 ${projectName}. All rights reserved.</text>
        
        <!-- Loading indicator -->
        <circle cx="1100" cy="50" r="15" fill="#3b82f6" opacity="0.7">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/>
        </circle>
        <text x="1120" y="55" fill="#3b82f6" font-family="Arial, sans-serif" font-size="12">Live</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
}

// Predefined screenshots for your projects using the simple service
export const projectScreenshots = {
  'profilesafterdark.com': SimpleScreenshotService.generateScreenshot({
    url: 'https://profilesafterdark.com',
    width: 1200,
    height: 630
  }),
  '50andbad.site': SimpleScreenshotService.generateScreenshot({
    url: 'https://50andbad.site',
    width: 1200,
    height: 630
  }),
  'marlowmarketing.org': SimpleScreenshotService.generateScreenshot({
    url: 'https://marlowmarketing.org',
    width: 1200,
    height: 630
  }),
  'ranktheglobe.com': SimpleScreenshotService.generateScreenshot({
    url: 'https://ranktheglobe.com',
    width: 1200,
    height: 630
  }),
  'neko-links.sogki.dev': SimpleScreenshotService.generateScreenshot({
    url: 'https://neko-links.sogki.dev',
    width: 1200,
    height: 630
  }),
  'neko-snippets.sogki.dev': SimpleScreenshotService.generateScreenshot({
    url: 'https://neko-snippets.sogki.dev',
    width: 1200,
    height: 630
  })
};

// Function to get screenshot for any URL
export const getProjectScreenshot = (url: string): string => {
  // For now, let's use a more reliable approach
  // We'll create better-looking placeholders that look like actual website previews
  return SimpleScreenshotService.generateWebsitePreview({ url });
};
