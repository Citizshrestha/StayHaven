import {
  RefreshCw,
  LayoutList,
  BellRing,
  UtensilsCrossed,
  TimerReset,
} from "lucide-react";
import OrderCard from "./OrderCard";

const DashboardContent = ({ orders, activeFilter, setActiveFilter }) => {
  const filteredOrders =
    activeFilter === "all"
      ? orders
      : orders.filter((order) => order.status === activeFilter);

  const handleRefresh = () => {
    console.log("Refreshing orders...");
    window.location.reload();
  };

  const filters = [
    { id: "all", label: "All", icon: LayoutList },
    { id: "new", label: "New", icon: BellRing },
    { id: "preparing", label: "Preparing", icon: UtensilsCrossed },
    { id: "ready", label: "Ready for Pickup", icon: TimerReset },
  ];

  return (
    <div className="w-full pb-24 lg:pb-8 px-6 pt-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-gray-900 leading-tight">
            Waiter Dashboard
          </h1>
          <p className="mt-1 text-[15px] text-gray-500">
            Real-time view of orders and table statuses.
          </p>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="self-start lg:self-auto inline-flex items-center gap-2 rounded-lg bg-[#10B981] px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#059669]"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2.5 mb-6">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-medium transition ${
                isActive
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-150"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      <div className="space-y-5">
        {filteredOrders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
};

export default DashboardContent;
