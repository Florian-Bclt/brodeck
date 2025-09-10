export default function Layout({ children }: { children: React.ReactNode}) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <main className="flex-grow">{children}</main>
    </div>
  )
}