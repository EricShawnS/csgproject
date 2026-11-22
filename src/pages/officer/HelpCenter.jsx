import { useState } from 'react';
import { Headphones, Mail, Phone, MessageSquare } from 'lucide-react';
import { Card, Toast } from '../../components/ui';

const OFFICER_FAQS = [
  {
    q: 'How do I add a new student?',
    a: 'CSG Officers do not manually add students. Student records come from the school enrollment records synced by Admin.',
  },
  {
    q: 'How can I record attendance?',
    a: 'Open Attendance, select the event, and choose Present, Late, Absent, or Excused for each student.',
  },
  {
    q: 'Who approves excuse requests?',
    a: 'The Admin/Instructor system reviews and decides on excuse requests. Approved excuses prevent penalties; Rejected stays Absent.',
  },
  {
    q: 'How do I record a payment?',
    a: 'Open Penalties & Payments, click Record Payment for the student, enter the amount, and attach proof.',
  },
  {
    q: 'How do I generate a report?',
    a: 'Open Reports, choose a report type, click Generate, and then export to PDF.',
  },
];

export default function HelpCenter() {
  const [toast, setToast] = useState('');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-soft/70 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-ink dark:border-slate-200">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink dark:text-white">
              How can we help you today?
            </h2>
            <p className="text-xs text-mut dark:text-slate-400">
              Browse help resources, common questions, or contact support for CSG Student Tracker.
            </p>
          </div>
        </div>

        <Card title="Quick Help">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              { title: 'User Guide', desc: 'Step-by-step attendance & penalty workflow' },
              { title: 'Video Tutorials', desc: 'Short walkthroughs for officers' },
              { title: 'FAQ', desc: 'Answers to common tracker questions' },
              { title: 'Contact Support', desc: 'Reach CSG technical support' },
            ].map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => showToast(`${item.title} guide opened.`)}
                className="rounded-xl border border-line bg-soft/40 p-3 text-left transition-colors hover:bg-soft dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <p className="text-sm font-bold text-ink dark:text-white">{item.title}</p>
                <p className="mt-0.5 text-xs text-mut dark:text-slate-300">{item.desc}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Frequently Asked Questions">
          <div className="divide-y divide-line dark:divide-slate-800">
            {OFFICER_FAQS.map((f) => (
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

      <Card title="Need More Help?">
        <p className="mb-3 text-xs text-mut">
          Reach out to support if you need assistance during live events.
        </p>
        <div className="space-y-2.5 text-xs">
          <a
            href="mailto:Support@csg.com"
            className="flex items-center gap-2.5 rounded-xl border border-line p-2.5 hover:bg-soft/60 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <Mail className="h-4 w-4" />
            <div>
              <p className="font-bold">Email Support</p>
              <p className="text-mut">Support@csg.com</p>
            </div>
          </a>
          <a
            href="tel:+639351112575"
            className="flex items-center gap-2.5 rounded-xl border border-line p-2.5 hover:bg-soft/60 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <Phone className="h-4 w-4" />
            <div>
              <p className="font-bold">Call us</p>
              <p className="text-mut">+63 935 1112 575</p>
            </div>
          </a>
          <button
            type="button"
            onClick={() => showToast('Live chat support is available Mon-Fri 8:00AM-5:00PM.')}
            className="flex w-full items-center gap-2.5 rounded-xl border border-line p-2.5 text-left hover:bg-soft/60 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <MessageSquare className="h-4 w-4" />
            <div>
              <p className="font-bold">Live chat</p>
              <p className="text-mut">Available Mon-Fri 8:00AM-5:00PM</p>
            </div>
          </button>
        </div>
      </Card>

      <Toast message={toast} />
    </div>
  );
}