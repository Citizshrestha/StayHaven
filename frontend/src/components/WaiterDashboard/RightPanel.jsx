import React from "react";
import { Clipboard, Clock, UtensilsCrossed } from "lucide-react";

const RightPanel = () => {
  const assignedAreas = [
    { id: 1, name: "Table 5", orderCount: 2 },
    { id: 2, name: "Table 8A", orderCount: 1 },
    { id: 3, name: "Room 204", orderCount: 1 },
    { id: 4, name: "Table 12", orderCount: 1 },
  ];
  const notifications = [
    {
      id: 1,
      icon: UtensilsCrossed,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      message: "New order received for Table 5",
      time: "2 minutes ago",
    },
    {
      id: 2,
      icon: Clipboard,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      message: "Order #82299 is ready for pickup",
      time: "5 minutes ago",
    },
    {
      id: 3,
      icon: Clock,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      message: "Kitchen update: Order #82300 delayed",
      time: "10 minutes ago",
    },
  ];

  return (
    <div className="h-full space-y-6 p-6">
      {/* Assigned Areas Card */}
      <div className="rounded-3xl bg-white px-6 py-5 shadow-[0_24px_48px_rgba(15,23,42,0.08)]">
        <div className="mb-4">
          <h2 className="text-[18px] font-bold text-gray-900">Assigned Areas</h2>
        </div>
        <div className="space-y-3">
          {assignedAreas.map((area) => (
            <div
              key={area.id}
              className="flex items-center justify-between rounded-2xl bg-[#F5F7FB] px-4 py-3"
            >
              <span className="text-[15px] font-semibold text-gray-900">
                {area.name}
              </span>
              <span className="text-[13px] font-semibold text-gray-500">
                {area.orderCount} {area.orderCount === 1 ? "Order" : "Orders"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications Card */}
      <div className="rounded-3xl bg-white px-6 py-5 shadow-[0_24px_48px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-gray-900">Notifications</h2>
        </div>
        <div className="space-y-4">
          {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <div key={notification.id} className="flex gap-3">
                <div
                  className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-[14px] ${notification.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${notification.iconColor}`} strokeWidth={2.2} />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-gray-900">
                    {notification.message}
                  </p>
                  <p className="text-[12px] font-semibold text-gray-400">
                    {notification.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
