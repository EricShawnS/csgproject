import { useState } from 'react';
import { Headphones, Mail, Phone, MessageSquare, Search } from 'lucide-react';
import { Card } from '../../components/ui';

const GUIDES = [
  {
    title: 'Event Scheduling & CSG Sync',
    summary: 'Create events with schedules, venues, and attendance rules; officers configure live tracking.',
  },
  {
    title: 'Reviewing Excuse Requests',
    summary: 'Inspect supporting documents, add remarks, and approve or reject requests to update attendance.',
  },
  {
    title: 'Enrollment Roster Sync',
    summary: 'Synchronize student records from school enrollment data without manual roster creation.',
  },
  {
    title: 'Generating & Exporting Reports',
    summary: 'Filter attendance, events, excuses, or student histories and export print/PDF views.',
  },
];

const FAQS = [
  {
    q: 'What happens when I approve an excuse request?',
    a: 'The request is recorded as Approved with your remarks and updates the linked student attendance record to Excused so penalties are prevented.',
  },
  {
    q: 'Why can’t I manually add individual students here?',
    a: 'Student Records syncs from official school enrollment data to keep IDs, courses, year levels, and sections consistent across systems.',
  },
  {
    q: 'Are Activity Log entries editable?',
    a: 'No. Activity Log entries are recorded automatically when key actions occur and remain read-only for audit integrity.',
  },
];

export default function HelpCenter() {
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const visibleGuides = q
    ? GUIDES.filter(
        (g) => g.title.toLowerCase().includes(q) || g.summary.toLowerCase().includes(q)
      )
    : GUIDES;

  const visibleFaqs = q
    ? FAQS.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
    : FAQS;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-soft/70 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-ink dark:border-slate-200">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink dark:text-white">
              Admin &amp; Instructor Help Center
            </h2>
            <p className="text-xs text-mut dark:text-slate-400">
              Search guides, walkthroughs, and FAQs for managing CSG operations.
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mut" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guides and FAQs..."
            aria-label="Search help center"
            className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <Card title="Guides & Tutorials">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visibleGuides.map((g) => (
              <div
                key={g.title}
                className="rounded-xl border border-line bg-soft/40 p-3 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <p className="text-sm font-semibold text-ink dark:text-white">{g.title}</p>
                <p className="mt-1 text-xs text-mut dark:text-slate-300">{g.summary}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Frequently Asked Questions">
          <div className="divide-y divide-line dark:divide-slate-800">
            {visibleFaqs.map((f) => (
              <details key={f.q} className="py-2.5">
                <summary className="cursor-pointer text-sm font-semibold text-ink dark:text-white">
                  {f.q}
                </summary>
                <p className="mt-1.5 text-xs text-mut dark:text-slate-300">{f.a}</p>
              </details>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Support Contact">
        <p className="mb-3 text-xs text-mut dark:text-slate-400">
          Need assistance with roles, enrollment sync, or Supabase configuration?
        </p>
        <div className="space-y-2.5 text-xs">
          <a
            href="mailto:support@csg.edu"
            className="flex items-center gap-2.5 rounded-xl border border-line p-2.5 hover:bg-soft/60 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <Mail className="h-4 w-4 text-admin-active" />
            <div>
              <p className="font-semibold text-ink dark:text-white">Email Support</p>
              <p className="text-mut">support@csg.edu</p>
            </div>
          </a>
          <a
            href="tel:+639351112575"
            className="flex items-center gap-2.5 rounded-xl border border-line p-2.5 hover:bg-soft/60 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <Phone className="h-4 w-4 text-admin-active" />
            <div>
              <p className="font-semibold text-ink dark:text-white">Phone Desk</p>
              <p className="text-mut">+63 935 1112 575</p>
            </div>
          </a>
          <div className="flex items-center gap-2.5 rounded-xl border border-line p-2.5 dark:border-slate-800">
            <MessageSquare className="h-4 w-4 text-admin-active" />
            <div>
              <p className="font-semibold text-ink dark:text-white">Office Hours</p>
              <p className="text-mut">Mon–Fri, 8:00 AM – 5:00 PM</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}