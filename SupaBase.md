# CSG System — Supabase Schema & RLS Notes

## 1. Environment Configuration
Set these in your `.env` (never commit secrets or the `service_role` key to the frontend):

```env
VITE_SUPABASE_URL=[https://your-project-ref.supabase.co](https://your-project-ref.supabase.co)
VITE_SUPABASE_ANON_KEY=your-anon-public-key