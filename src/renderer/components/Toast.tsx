import { useAppStore } from '../store/useAppStore';
import { X } from 'lucide-react';

export const Toast = () => {
  const notifications = useAppStore(state => state.notifications);
  const removeToast = useAppStore(state => state.removeToast);

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
      {notifications.map(n => (
        <div
          key={n.id}
          className={`max-w-sm w-full px-4 py-3 rounded-md shadow-lg flex items-start gap-3 text-sm ${toastClass(n.type)}`}
        >
          <div className="flex-1">
            <div className="font-semibold">{n.type?.toUpperCase()}</div>
            <div className="text-gray-100 text-xs mt-1">{n.message}</div>
          </div>
          <button onClick={() => removeToast(n.id)} className="text-gray-100 opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

function toastClass(type?: string) {
  switch (type) {
    case 'success':
      return 'bg-green-600';
    case 'error':
      return 'bg-red-600';
    case 'warning':
      return 'bg-amber-600';
    default:
      return 'bg-slate-700';
  }
}
