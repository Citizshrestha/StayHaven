const OrderCard = ({ order }) => {
  const handleUpdateStatus = () => {
    console.log(`Updating status for order ${order.id}`);
  };

  const handleViewDetails = () => {
    console.log(`Viewing details for order ${order.id}`);
  };

  const handleMarkServed = () => {
    console.log(`Marking order ${order.id} as served`);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "new":
        return {
          badge: "bg-blue-50 text-blue-600",
          label: "New",
        };
      case "preparing":
        return {
          badge: "bg-yellow-50 text-yellow-600",
          label: "Preparing",
        };
      case "ready":
        return {
          badge: "bg-green-50 text-green-600",
          label: "Ready for Pickup",
        };
      default:
        return {
          badge: "bg-gray-50 text-gray-600",
          label: status,
        };
    }
  };

  const statusConfig = getStatusConfig(order.status);

  return (
    <div className="overflow-hidden rounded-[26px] bg-white shadow-[0_24px_48px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col md:flex-row h-full">
        {/* Left Content */}
        <div className="flex-1 p-7 flex flex-col justify-between">
          <div>
            {/* Header: Badge + Time */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold leading-none ${statusConfig.badge}`}
              >
                {statusConfig.label}
              </span>
              <span className="text-[14px] font-semibold text-gray-400">
                {order.table} · {order.time}
              </span>
            </div>

            {/* Order ID */}
            <h3 className="text-[24px] font-bold text-gray-900 mb-2">
              Order #{order.id}
            </h3>

            {/* Items */}
            <p className="text-[15px] leading-relaxed text-gray-500 max-w-[500px]">
              {order.items}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            {order.status === "ready" ? (
              <>
                <button
                  onClick={handleViewDetails}
                  className="flex-1 rounded-full bg-[#F3F4F6] px-5 py-3 text-[14px] font-semibold text-gray-700 transition hover:bg-[#E5E7EB]"
                >
                  View Details
                </button>
                <button
                  onClick={handleMarkServed}
                  className="flex-1 rounded-full bg-[#10B981] px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-[#0EA271]"
                >
                  Mark Served
                </button>
              </>
            ) : (
              <button
                onClick={handleUpdateStatus}
                className="w-full rounded-full bg-[#10B981] px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-[#0EA271]"
              >
                Update Status
              </button>
            )}
          </div>
        </div>

        {/* Right Image - Flush to edge */}
        <div className="w-full md:w-[250px] xl:w-[280px] h-56 md:h-auto">
          <img
            src={order.image}
            alt="Food"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
