"use client";

import LandingNav from '@/components/LandingNav';
import Footer from '@/components/Footer';
import { Icon } from '@iconify/react';

export default function DpaPage() {
  const sections = [
    {
      title: '1. Purpose and Scope',
      content: 'This Data Processing Agreement ("DPA") governs the processing of personal data by OptiDrive on behalf of the customer ("Controller") in connection with the image optimization and content delivery services defined in the Terms of Service. This DPA forms an integral part of the service agreement between both parties and is designed to ensure compliance with Article 28 of the GDPR, CCPA, and equivalent global privacy laws.'
    },
    {
      title: '2. Details of the Processing Operations',
      content: '• Categories of Data Subjects: Users, customers, website visitors, and employees of the Controller whose media assets are processed or delivered via OptiDrive.\n• Types of Personal Data: Uploaded media assets containing human likenesses, user profiles, image metadata, request IP addresses, geolocations, and referring URLs.\n• Nature and Purpose: Automated real-time image compression, resizing, transformation, caching, and CDN asset delivery.\n• Duration: The duration of processing corresponds to the lifespan of the Controller\'s workspace registration.'
    },
    {
      title: '3. Obligations of the Processor (OptiDrive)',
      content: 'OptiDrive hereby covenants and agrees to:\n\n• Process Personal Data only on documented instructions from the Controller, including with respect to transfers of personal data to a third country.\n• Ensure that personnel authorized to process the personal data have committed themselves to strict confidentiality or are under an appropriate statutory obligation of confidentiality.\n• Implement and maintain appropriate technical and organizational security measures (defined in Section 4) to ensure a level of security appropriate to the risk.'
    },
    {
      title: '4. Technical and Organizational Security Measures',
      content: 'OptiDrive has implemented and will maintain the following security infrastructure:\n\n• Encryption in Transit: All API payloads and dashboard traffic are protected using TLS 1.3 encryption.\n• Encryption at Rest: Workspace BYOS bucket keys and configuration credentials are encrypted using AES-256 keys.\n• Network Isolation: Databases reside in secure virtual private clouds (VPCs) with restricted external access.\n• Access Audits: Every system administration action is logged inside secure audit databases.'
    },
    {
      title: '5. Sub-processors',
      content: 'The Controller grants a general authorization to OptiDrive to engage third-party sub-processors (such as Stripe for payments, AWS/Vercel for CDN, and Neon for database hosting). We will maintain an up-to-date list of sub-processors on our website and notify the Controller of any intended changes at least 14 days in advance, giving the Controller the opportunity to object to such changes.'
    },
    {
      title: '6. Personal Data Breach Notification',
      content: 'In the event of a confirmed security incident resulting in the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to personal data processed by us, OptiDrive will notify the Controller without undue delay, and in any event within 72 hours of becoming aware of the breach.'
    },
    {
      title: '7. Assistance and Audits',
      content: 'OptiDrive will assist the Controller in fulfilling its obligations to respond to data subjects\' requests to exercise their rights under GDPR Chapter III. Furthermore, OptiDrive will make available to the Controller all information necessary to demonstrate compliance with Article 28 of the GDPR and allow for and contribute to audits, including inspections, conducted by the Controller or an auditor mandated by the Controller.'
    },
    {
      title: '8. Deletion or Return of Personal Data',
      content: 'Upon termination of the service agreement, or upon manual deletion of assets by the Controller via the API/Dashboard, OptiDrive will permanently delete all master files and cached duplicates within 30 days, unless EU or member state law requires retention of the personal data.'
    }
  ];

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="flex flex-col bg-bg text-text-light font-sans w-full min-h-screen overflow-x-hidden selection:bg-accent selection:text-white print:bg-white print:text-black">
      <div className="print:hidden">
        <LandingNav />
      </div>

      <section className="relative px-6 md:px-16 pt-16 pb-20 max-w-4xl mx-auto w-full z-10 text-left print:pt-4 print:pb-4">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-accent/10 opacity-55 blur-3xl pointer-events-none print:hidden" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 print:hidden">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-4 py-1.5 self-start">
            <Icon icon="lucide:file-signature" width={12} height={12} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400">Legal Agreement</span>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-xs font-semibold text-text-muted hover:text-text-light transition-all cursor-pointer self-start sm:self-auto"
            title="Print this agreement for your compliance records"
          >
            <Icon icon="lucide:printer" width={14} />
            <span>Print Policy</span>
          </button>
        </div>

        <h1 className="font-headings font-bold text-4xl md:text-5xl text-text-light print:text-black leading-tight mb-4">
          Data Processing Addendum (DPA)
        </h1>
        <p className="text-text-muted text-sm sm:text-base mb-12 border-b border-slate-800 print:border-black/20 pb-8">
          Last updated: July 09, 2026. This agreement outlines GDPR-compliant data processor obligations.
        </p>

        <div className="flex flex-col gap-10 max-w-3xl">
          {sections.map((sect, i) => (
            <div key={i} className="flex flex-col gap-3 break-inside-avoid">
              <h2 className="font-headings font-bold text-lg sm:text-xl text-text-light print:text-black border-l-2 border-indigo-550 pl-4">{sect.title}</h2>
              <p className="text-xs sm:text-sm text-text-muted print:text-black/85 leading-relaxed whitespace-pre-line">{sect.content}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
