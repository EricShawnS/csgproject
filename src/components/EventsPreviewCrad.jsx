import { useEffect, useState } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ocsnjcvvfqkgogtktmwr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jc25qY3Z2ZnFrZ29ndGt0bXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMjc5MDksImV4cCI6MjExMDgwMzkwOX0.YNc51tFZFK2GvYNefZj5M2Nu56W7-55sTcakNzcBvuo';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function EventsPreviewCard(props) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchEvents() {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('events')
        .select('*')
        .order('event_date', { ascending: false })
        .limit(4);

      if (active) {
        if (!error && Array.isArray(data)) {
          setEvents(data);
        }
        setLoading(false);
      }
    }

    fetchEvents();
    return () => {
      active = false;
    };
  }, []);

  function handleViewAll() {
    if (typeof props.onViewAll === 'function') {
      props.onViewAll();
      return;
    }
    if (typeof props.setActiveTab === 'function') {
      props.setActiveTab('events');
      return;
    }
    if (typeof props.onTabChange === 'function') {
      props.onTabChange('events');
      return;
    }
    if (typeof props.navigate === 'function') {
      props.navigate('/admin/events');
      return;
    }
    window.location.hash = '#/admin/events';
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-white">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base font-semibold">Events Preview</h2>
        </div>

        <button
          type="button"
          onClick={handleViewAll}
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          <span>View All</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-slate-400">No events found.</p>
      ) : (
        <ul className="divide-y divide-slate-800">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium text-slate-100">
                  {ev.name || ev.title || 'Untitled Event'}
                </p>
                <p className="text-xs text-slate-400">
                  {ev.event_date || ev.date || 'No date set'}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs ${
                  ev.accept_excuse
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-slate-700/60 text-slate-300'
                }`}
              >
                {ev.accept_excuse ? 'Excuses Open' : 'Closed'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}