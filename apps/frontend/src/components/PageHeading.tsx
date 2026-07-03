interface PageHeadingProps {
  title: string;
  children?: React.ReactNode;
}

const PageHeading = ({ title, children }: PageHeadingProps) => {
  return (
    <div className="border-border flex flex-col sm:flex-row min-h-20 py-4 sm:py-0 items-start sm:items-center justify-between gap-4 sm:gap-3 sm:border-b px-6 sm:px-8">
      <h1 className="text-text-light font-bold text-xl sm:text-2xl whitespace-nowrap">{title}</h1>
      {children && (
        <div className="w-full sm:w-auto overflow-x-auto sm:overflow-visible scrollbar-hide">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeading;
