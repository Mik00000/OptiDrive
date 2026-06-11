
const StorageUsedBar = () => {
  return (
            <section className="border-border bg-card flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border p-5.25">
          <div className="flex items-center justify-between">
            <p className="text-text-light text-sm font-medium">Storage Used</p>
            <p className="text-text-muted font-regular text-sm font-mono">
              4.2 GB / 10 GB
            </p>
          </div>
          <div className="bg-bg border-border h-2 w-full rounded-full border">
            <div className="bg-chart-gradient h-full w-[42%] rounded-full"></div>
          </div>

        </section>
  )
}

export default StorageUsedBar
