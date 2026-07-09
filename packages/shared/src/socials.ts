export interface SocialLink {
  id: string;
  name: string;
  iconName: string;
  url: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'github',
    name: 'GitHub',
    iconName: 'lucide:github',
    url: 'https://github.com/Mik00000/OptiDrive',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    iconName: 'lucide:linkedin',
    url: 'https://www.linkedin.com/in/mik-jarkov-dev/',
  },
  {
    id: 'mail',
    name: 'Email',
    iconName: 'lucide:mail',
    url: 'mailto:troutundefined5894@gmail.com',
  },
];
