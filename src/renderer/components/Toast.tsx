import { useAppStore } from '../store/useAppStore';
import { X } from 'lucide-react';

export const Toast = () => {
  const notifications = useAppStore(state => state.notifications);
  const removeToast = useAppStore(state => state.removeToast);

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
      {notifications.map(n => (
        <div
          key={n.id}
          className={`max-w-md w-full px-6 py-4 rounded-lg shadow-2xl flex items-start gap-4 text-base ${toastClass(n.type)}`}
        >
          <div className="flex-1">
            <div className="font-semibold text-white">{n.type?.toUpperCase()}</div>
            <div className="text-gray-100 text-sm mt-1">{n.message}</div>
          </div>
          <button onClick={() => removeToast(n.id)} className="text-gray-100 opacity-80 hover:opacity-100">
            <X className="w-5 h-5" />
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
