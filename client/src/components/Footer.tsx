export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">
        <p>&copy; {new Date().getFullYear()} ASGR Rankings. All rights reserved.</p>
      </div>
    </footer>
  )
}
