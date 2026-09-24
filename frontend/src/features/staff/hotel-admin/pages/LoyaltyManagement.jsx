import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Star, Users, TrendingUp, Award, RefreshCw, Medal, Gem, Crown, Trophy } from 'lucide-react';
import { toast } from 'react-toastify';
import { getGuestsList } from '../../../../core/api/services/reception.service';
import {
  PageHeader,
  Button,
  Badge,
  StatCard,
  StatCardSkeleton,
  SearchInput,
  FilterTabs,
  Table,
  THead,
  SortableTh,
  TableSkeleton,
  EmptyState,
  Pagination,
} from '../components/ui';
import useDebouncedValue from '../hooks/useDebouncedValue';
import useTableControls from '../hooks/useTableControls';
import '../styles/hotel-admin-tokens.css';

/* Tier model — distinct icon + colour per rank (NOT status colours, §5.10) */
const TIER = {
  Bronze: { Icon: Medal, color: 'var(--ha-tier-bronze)', bg: 'var(--ha-tier-bronze-bg)' },
  Silver: { Icon: Award, color: 'var(--ha-tier-silver)', bg: 'var(--ha-tier-silver-bg)' },
  Gold: { Icon: Trophy, color: 'var(--ha-tier-gold)', bg: 'var(--ha-tier-gold-bg)' },
  Platinum: { Icon: Gem, color: 'var(--ha-tier-platinum)', bg: 'var(--ha-tier-platinum-bg)' },
  Diamond: { Icon: Crown, color: 'var(--ha-tier-diamond)', bg: 'var(--ha-tier-diamond-bg)' },
};

const fmt = (n) => (n || 0).toLocaleString('en-IN');

const TierBadge = ({ tier }) => {
  const t = TIER[tier] || TIER.Bronze;
  const TIcon = t.Icon;
  return (
    <span
      className="ha-badge"
      style={{ color: t.color, background: t.bg, textTransform: 'none' }}
    >
      <TIcon size={13} aria-hidden="true" /> {tier || 'Bronze'}
    </span>
  );
};

const LoyaltyManagement = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [tierFilter, setTierFilter] = useState('all');

  const fetchGuests = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getGuestsList({ limit: 200 });
      setGuests(res.data || res.guests || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load guests');
      toast.error(err.response?.data?.message || 'Failed to load guests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGuests(false);
  }, [fetchGuests]);

  const byTier = useMemo(
    () =>
      guests.reduce((acc, g) => {
        const t = g.membershipTier || 'Bronze';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {}),
    [guests]
  );

  const totalPoints = useMemo(() => guests.reduce((s, g) => s + (g.loyaltyPoints || 0), 0), [guests]);
  const totalSpent = useMemo(() => guests.reduce((s, g) => s + (g.totalSpent || 0), 0), [guests]);
  const goldPlus = (byTier.Gold || 0) + (byTier.Platinum || 0) + (byTier.Diamond || 0);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return guests.filter((g) => {
      const matchTier = tierFilter === 'all' || g.membershipTier === tierFilter;
      const matchSearch =
        !q ||
        (g.fullName || '').toLowerCase().includes(q) ||
        (g.email || '').toLowerCase().includes(q) ||
        (g.guestId || '').toLowerCase().includes(q);
      return matchTier && matchSearch;
    });
  }, [guests, tierFilter, debouncedSearch]);

  const { paged, page, setPage, pageSize, totalItems, sortKey, sortDir, toggleSort } = useTableControls(filtered, {
    pageSize: 12,
    initialSortKey: 'loyaltyPoints',
    initialSortDir: 'desc',
    accessors: {
      fullName: (g) => g.fullName,
      loyaltyPoints: (g) => g.loyaltyPoints || 0,
      totalStays: (g) => g.totalStays || 0,
      totalSpent: (g) => g.totalSpent || 0,
    },
  });

  const tierOptions = [
    { value: 'all', label: 'All', count: guests.length },
    ...Object.keys(TIER).map((name) => ({ value: name, label: name, count: byTier[name] || 0 })),
  ];

  return (
    <div className="ha-page">
      <PageHeader
        title="Loyalty Points"
        subtitle="Guest membership tiers and points overview."
        actions={
          <Button variant="secondary" onClick={() => fetchGuests(true)} disabled={refreshing}>
            <RefreshCw size={16} aria-hidden="true" /> Refresh
          </Button>
        }
        toolbar={
          <>
            <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or guest ID…" ariaLabel="Search guests" />
            <FilterTabs options={tierOptions} value={tierFilter} onChange={setTierFilter} ariaLabel="Filter by tier" />
          </>
        }
      />

      <div className="ha-kpi-grid" style={{ marginBottom: 24 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={<Users size={22} />} iconBg="linear-gradient(135deg,#6366f1,#4f46e5)" label="Total Members" value={fmt(guests.length)} />
            <StatCard icon={<Star size={22} />} iconBg="var(--ha-warning)" label="Total Points Issued" value={fmt(totalPoints)} />
            <StatCard icon={<TrendingUp size={22} />} iconBg="var(--ha-success)" label="Total Guest Spending" value={`Rs. ${fmt(totalSpent)}`} />
            <StatCard icon={<Trophy size={22} />} iconBg="linear-gradient(135deg,#f59e0b,#f97316)" label="Gold+ Members" value={fmt(goldPlus)} />
          </>
        )}
      </div>

      {error ? (
        <EmptyState icon={<Star size={26} />} title="Couldn't load loyalty data" description={error} action={<Button variant="secondary" size="sm" onClick={() => fetchGuests(true)}>Retry</Button>} />
      ) : (
        <>
          <Table minWidth={720}>
            <THead>
              <SortableTh sortKey="fullName" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Guest</SortableTh>
              <th scope="col">Tier</th>
              <SortableTh sortKey="loyaltyPoints" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Points</SortableTh>
              <SortableTh sortKey="totalStays" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Total Stays</SortableTh>
              <SortableTh sortKey="totalSpent" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Total Spent</SortableTh>
              <th scope="col">Status</th>
            </THead>
            {loading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : (
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={<Star size={26} />} title="No guests found" description="Guests appear here once they have bookings in your hotel." />
                    </td>
                  </tr>
                ) : (
                  paged.map((g) => {
                    const inHouse = g.status === 'In-House';
                    return (
                      <tr key={g._id || g.guestId}>
                        <td>
                          <div className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>{g.fullName}</div>
                          <div className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{g.email || g.guestId}</div>
                        </td>
                        <td><TierBadge tier={g.membershipTier} /></td>
                        <td className="ha-body-strong haNum" style={{ color: 'var(--ha-text)' }}>{fmt(g.loyaltyPoints)}</td>
                        <td className="haNum">{g.totalStays || 0}</td>
                        <td className="ha-money haNum">Rs. {fmt(g.totalSpent)}</td>
                        <td><Badge tone={inHouse ? 'success' : 'neutral'}>{g.status || 'Checked-Out'}</Badge></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            )}
          </Table>
          {!loading && <Pagination page={page} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} itemLabel="members" />}
        </>
      )}
    </div>
  );
};

export default LoyaltyManagement;
