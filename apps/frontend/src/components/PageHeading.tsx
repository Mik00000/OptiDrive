interface PageHeadingProps {
  title: string;
  children?: React.ReactNode;
}

const PageHeading = ({ title, children }: PageHeadingProps) => {
  return (
    <div className="fz-6 fw-600 border-border flex h-20 items-center justify-between gap-3 sm:border-b px-8">
      <h1 className="text-text-light font-bold text-xl sm:text-2xl">{title}</h1>
      {children}
    </div>
  );
};

export default PageHeading;
