import React from 'react';
import { X, Calendar, Edit3, Trash2, MapPin, Tag } from 'lucide-react';
import type { CheckInRecord } from '../types';

interface CheckInHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkIns: CheckInRecord[];
  onEdit: (record: CheckInRecord) => void;
  onDelete: (recordId: string) => Promise<void>;
}

export const CheckInHistoryModal: React.FC<CheckInHistoryModalProps> = ({
  isOpen,
  onClose,
  checkIns,
  onEdit,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="checkin-history-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-[#FAF9F5] border border-[#D1CDBE] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-[#D1CDBE] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#3D3C38]">
              Mood Check-In Records ({checkIns.length})
            </h2>
            <p className="text-xs text-[#7C7A70]">
              Review, edit, or delete any past emotional check-in record.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#7C7A70] hover:text-[#3D3C38] hover:bg-[#EFEEE8] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {checkIns.length === 0 ? (
            <div className="text-center py-12 text-[#7C7A70]">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-medium">No check-in records logged yet.</p>
              <p className="text-xs mt-1">Perform a quick daily check-in to track your mood patterns.</p>
            </div>
          ) : (
            checkIns.map((item) => {
              const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white border border-[#E2DFD2] shadow-2xs flex items-start justify-between gap-3 hover:border-[#CAD5C6] transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#5A5A40] text-white">
                        {item.mood}
                      </span>
                      <span className="text-xs font-medium text-[#5E5D57] bg-[#EFEEE8] px-2 py-0.5 rounded-md">
                        Intensity {item.intensity}/5
                      </span>
                      <span className="text-[11px] text-[#7C7A70] flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-[#3D3C38] line-clamp-2 italic">
                        "{item.notes}"
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#7C7A70]">
                      {item.activities && item.activities.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Tag className="w-3 h-3 text-[#5A5A40]" />
                          {item.activities.map((act) => (
                            <span key={act} className="bg-[#FAF9F5] border border-[#D1CDBE] px-1.5 py-0.5 rounded text-[10px]">
                              {act}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.location?.address && (
                        <div className="flex items-center gap-1 text-[10px]">
                          <MapPin className="w-3 h-3 text-[#5A5A40]" />
                          <span className="truncate max-w-[150px]">{item.location.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      id={`edit-checkin-${item.id}`}
                      onClick={() => onEdit(item)}
                      className="p-1.5 rounded-lg text-[#7C7A70] hover:text-[#3D3C38] hover:bg-[#EFEEE8] transition-colors cursor-pointer"
                      title="Edit check-in"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`delete-checkin-${item.id}`}
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete check-in"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
