import { useNavigate } from 'react-router-dom';
import { Download, Github, Linkedin, Mail, Globe } from 'lucide-react';
import AdminCard from '../AdminCard';
import AdminButton from '../AdminButton';
import { adminApi } from '../../../lib/adminApi';
import { useAdminToast } from '../../../context/AdminToastContext';

type LifeQuickActionsProps = {
  links: {
    portfolio: string;
    github: string;
    linkedin: string;
  };
};

export default function LifeQuickActions({ links }: LifeQuickActionsProps) {
  const navigate = useNavigate();
  const { toast } = useAdminToast();

  const emailCv = async () => {
    try {
      await adminApi.sendCvEmail({ includeAll: true });
      toast.success('CV export email sent.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to email CV');
    }
  };

  return (
    <AdminCard id="widget-quick-actions" title="Quick Actions" className="h-full">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <AdminButton variant="secondary" onClick={() => navigate('/admin/cvs')}>
          <Download size={14} />
          Download CV
        </AdminButton>
        <AdminButton variant="primary" onClick={() => void emailCv()}>
          <Mail size={14} />
          Email CV
        </AdminButton>
        <a href={links.portfolio} className="block">
          <AdminButton variant="secondary" className="w-full">
            <Globe size={14} />
            Open Portfolio
          </AdminButton>
        </a>
        <a href={links.github} target="_blank" rel="noreferrer" className="block">
          <AdminButton variant="secondary" className="w-full">
            <Github size={14} />
            Open GitHub
          </AdminButton>
        </a>
        <a href={links.linkedin} target="_blank" rel="noreferrer" className="block sm:col-span-2">
          <AdminButton variant="secondary" className="w-full">
            <Linkedin size={14} />
            Open LinkedIn
          </AdminButton>
        </a>
      </div>
    </AdminCard>
  );
}
