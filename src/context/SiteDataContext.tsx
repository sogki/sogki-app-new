import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchProjects,
  fetchSocialLinks,
  fetchFooterConfig,
  fetchSiteContent,
  type Project,
  type SocialLink,
  type FooterConfig,
  type SiteContentMap,
} from '../lib/siteData';

type SiteDataState = {
  projects: Project[];
  socialLinks: SocialLink[];
  footerConfig: FooterConfig | null;
  siteContent: SiteContentMap;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const SiteDataContext = createContext<SiteDataState | null>(null);

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [footerConfig, setFooterConfig] = useState<FooterConfig | null>(null);
  const [siteContent, setSiteContent] = useState<SiteContentMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [proj, social, footer, content] = await Promise.all([
        fetchProjects(),
        fetchSocialLinks(),
        fetchFooterConfig(),
        fetchSiteContent().catch(() => ({})),
      ]);
      setProjects(proj);
      setSocialLinks(social);
      setFooterConfig(footer);
      setSiteContent(content);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load site data');
      setProjects([]);
      setSocialLinks([]);
      setFooterConfig(null);
      setSiteContent({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SiteDataContext.Provider
      value={{
        projects,
        socialLinks,
        footerConfig,
        siteContent,
        isLoading,
        error,
        refetch: load,
      }}
    >
      {children}
    </SiteDataContext.Provider>
  );
}

export function useSiteData(): SiteDataState {
  const ctx = useContext(SiteDataContext);
  if (!ctx) throw new Error('useSiteData must be used within SiteDataProvider');
  return ctx;
}
