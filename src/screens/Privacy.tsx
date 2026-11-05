import { AppHeader } from '@/components/AppHeader';
import { Brand } from '@/config/brand';

/** Plain-language privacy notice describing what the app actually does. */
export function Privacy() {
  const h2 = 'mt-8 font-display text-xl';
  return (
    <div className="min-h-dvh">
      <AppHeader back="/" title="Privacy" />
      <main className="mx-auto max-w-2xl px-4 pb-16 text-[15px] leading-relaxed text-ink/90 sm:px-6">
        <h1 className="mt-6 font-display text-3xl">Your photos stay yours</h1>
        <p className="mt-2 text-muted">Last updated 5 November 2026</p>

        <h2 className={h2}>The short version</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{Brand.name} has no accounts, no sign-in and no payments.</li>
          <li>Your photos, albums and answers are stored only in this browser on this device. They are never uploaded.</li>
          <li>There is no advertising, no analytics and no tracking, and no cookies are set.</li>
          <li>Photo analysis (spotting near-duplicates, blur and where to crop) runs on your device.</li>
        </ul>

        <h2 className={h2}>What’s stored, and where</h2>
        <p className="mt-2">
          When you make an album, its details (title, answers, checklist, page designs) and resized copies of your photos are saved in your browser’s storage (IndexedDB) on
          this device. Nobody else can see them, including us. They stay until you delete the album, clear your browser’s data, or the browser removes them (iPhone
          Safari can do this for sites you haven’t opened for a while, unless the app is on your Home Screen).
        </p>

        <h2 className={h2}>Files you create</h2>
        <p className="mt-2">
          PDFs and backup files are made on your device and saved wherever you choose. A backup file contains the album and its photos; keep it somewhere private.
          Restoring a backup reads the file on your device only.
        </p>

        <h2 className={h2}>The website itself</h2>
        <p className="mt-2">
          The app is served by GitHub Pages. Like any web host, GitHub receives standard request information (such as your IP address) when your browser loads the
          site; see GitHub’s privacy statement. The app’s fonts and code are part of the site, so no other services are contacted.
        </p>

        <h2 className={h2}>Deleting your data</h2>
        <p className="mt-2">
          Delete an album from its menu in your library: its details and photos are removed from this device. To remove everything, clear this site’s data in your browser
          settings. Photos in your camera roll are never changed.
        </p>

        <h2 className={h2}>Children</h2>
        <p className="mt-2">The app doesn’t collect personal information from anyone, including children. Albums about children stay on the device that made them.</p>

        <h2 className={h2}>Changes and questions</h2>
        <p className="mt-2">
          If this changes (for example if optional cloud backup is added), this page will say so before anything is uploaded, and it would be off unless you turn it on.
          Questions: see the project on{' '}
          <a className="text-pop underline" href="https://github.com/memmamally-source/in-pictures" rel="noreferrer" target="_blank">
            GitHub
          </a>
          .
        </p>
      </main>
    </div>
  );
}
