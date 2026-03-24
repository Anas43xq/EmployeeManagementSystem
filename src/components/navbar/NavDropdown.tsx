import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { ITEMS_BY_ROLE, type NavCategory } from './navConfig';

/** Renders a top-nav dropdown filtered to the current user's allowed routes. */
export function NavDropdown({ category, role, isRTL }: { category: NavCategory; role: string; isRTL: boolean }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowed = ITEMS_BY_ROLE[role] ?? [];
  const items = category.items.filter(i => allowed.includes(i.href));
  if (items.length === 0) return null;

  const isActive = items.some(i => location.pathname.startsWith(i.href));

  const handleEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 100);
  };

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors group relative ${
          isActive ? 'text-primary-700' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <span className="relative">
          {category.label}
          <span
            className={`absolute -bottom-1 left-0 h-0.5 bg-primary-600 rounded-full transition-all duration-200 ${
              isActive ? 'w-full' : 'w-0 group-hover:w-full'
            }`}
          />
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 transition-all duration-200 origin-top ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
        }`}
      >
        <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {category.label}
        </p>
        {items.map(item => {
          const isItemActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors mx-1 rounded-lg ${
                isItemActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => setOpen(false)}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
