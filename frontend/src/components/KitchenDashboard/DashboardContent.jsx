import React from "react";

const DashboardContent = ({ orders = [], activeFilter = "all", setActiveFilter = () => {}, onUpdateOrderStatus = () => {}, onRefresh = () => {}, isRefreshing = false }) => {
	const visible = Array.isArray(orders) ? orders.filter(o => activeFilter === 'all' ? true : o.status === activeFilter) : [];
	return (
		<div style={{ minHeight: 400 }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
				<h2 style={{ margin: 0 }}>Kitchen Dashboard</h2>
				<div>
					<button onClick={() => onRefresh()} style={{ marginRight: 8 }}>{isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
					<select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
						<option value="all">All</option>
						<option value="new">New</option>
						<option value="preparing">Preparing</option>
						<option value="ready">Ready</option>
						<option value="delivered">Delivered</option>
					</select>
				</div>
			</div>
			<ul style={{ listStyle: 'none', padding: 0 }}>
				{visible.length === 0 ? (
					<li style={{ padding: 12, color: 'var(--text-tertiary)' }}>No orders</li>
				) : (
					visible.map((o) => (
						<li key={o.id || o._id} style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<div>
								<div style={{ fontWeight: 700 }}>{o.customerName || o.customer || 'Guest'}</div>
								<div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{o.table || o.room || 'Unknown'}</div>
							</div>
							<div style={{ display: 'flex', gap: 8 }}>
								<div style={{ alignSelf: 'center' }}>{o.status}</div>
								<button onClick={() => onUpdateOrderStatus(o.id || o._id, 'ready')}>Mark Ready</button>
							</div>
						</li>
					))
				)}
			</ul>
		</div>
	);
};

export default DashboardContent;
