import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';

export const ProjectTab = () => {
  return (
    <div className="flex max-w-4xl flex-col gap-6 lg:gap-8 pb-8">
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        <div className="border-border border-b px-4 py-4 sm:px-6">
          <span className="text-text-light text-lg font-semibold">
            Project Preferences
          </span>
          <p className="text-text-muted text-sm mt-1">
            Configure global settings for your active project.
          </p>
        </div>
        
        <div className="border-border flex flex-col gap-5 border-b p-4 sm:p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="projectName" className="fz-13 fw-500 text-text-light">
              Project Name
            </label>
            <Input
              variant="text"
              name="projectName"
              id="projectName"
              className="rounded-lg"
              placeholder="e.g. OptiDrive Alpha"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="fz-13 fw-500 text-text-light">
              Description
            </label>
            <Input
              variant="text"
              name="description"
              id="description"
              className="rounded-lg"
              placeholder="Brief description of the project"
            />
          </div>
        </div>
        
        <div className="bg-bg flex items-center justify-end px-4 py-4 sm:px-6">
          <Button variant="accent" className="w-full sm:w-auto justify-center">Save Changes</Button>
        </div>
      </div>
    </div>
  );
};
