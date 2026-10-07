import jwt from 'jsonwebtoken';
import { User } from '../models/user.schema.js';
import { Hotel } from '../models/hotel.schema.js';
import { Message } from '../models/message.schema.js';
import { getAccessTokenSecret } from '../utils/tokenUtils.js';

const isId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const staffRoles = new Set(['owner', 'admin', 'manager', 'hoteladmin', 'chief', 'kitchen', 'waiter', 'receptionist', 'housekeeping', 'maintenance']);

export async function authenticateSocket(socket) {
  const token = socket.handshake.auth?.token;
  if (!token) return; // Anonymous QR guests only receive their own session updates.
  const decoded = jwt.verify(token, getAccessTokenSecret(), { algorithms: ['HS256'] });
  if (decoded.type !== 'access' || !isId(decoded.id) || !Number.isFinite(decoded.exp) || !Number.isFinite(decoded.iat)) throw new Error('Invalid access token');
  const user = await User.findById(decoded.id).select('role companyRole company assignedProperties fullname isActive isDeleted accountStatus passwordChangedAt').populate('role', 'name');
  if (!user || user.isActive === false || user.isDeleted || user.accountStatus === 'deactivated' ||
      (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000))) throw new Error('Account unavailable');
  socket.authUser = {
    userId: String(user._id), role: user.role?.name || user.companyRole || 'guest',
    fullname: user.fullname, companyId: user.company ? String(user.company) : null,
    hotelIds: (user.assignedProperties || []).map(id => String(id._id || id)),
    expiresAt: decoded.exp * 1000,
  };
}

export async function canJoinHotel(socket, hotelId) {
  const auth = socket.authUser;
  if (!auth || !isId(hotelId)) return false;
  if (auth.role === 'superadmin') return true;
  if (!staffRoles.has(auth.role)) return false;
  const hotel = await Hotel.findById(hotelId).select('company owner');
  if (!hotel) return false;
  if (auth.role === 'owner' && String(hotel.owner) === auth.userId) return true;
  if (!auth.companyId || String(hotel.company) !== auth.companyId) return false;
  return ['owner', 'admin'].includes(auth.role) || auth.hotelIds.includes(hotelId);
}

// Validate every client-originated event before a relay or room subscription.
// Identity fields are replaced with values from the authenticated account.
export async function authorizeSocketPacket(socket, packet) {
  const [event, data] = packet;
  if (event === 'join-guest-session') return true;
  const auth = socket.authUser;
  if (!auth || auth.expiresAt <= Date.now()) return false;
  if (event === 'join-hotel') return canJoinHotel(socket, data);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (event === 'join-role') {
    if (data.hotelId && !(await canJoinHotel(socket, data.hotelId))) return false;
    Object.assign(data, { userId: auth.userId, role: auth.role, fullname: auth.fullname });
    return true;
  }
  const relays = new Set(['typing', 'stop-typing', 'acknowledge-call', 'answer-call', 'decline-call', 'end-call', 'webrtc-offer', 'webrtc-answer', 'webrtc-ice-candidate']);
  if (!relays.has(event)) return false;
  if (!(await canJoinHotel(socket, data.hotelId))) return false;
  Object.assign(data, { userId: auth.userId, fullname: auth.fullname, waiterId: auth.userId, waiterName: auth.fullname });
  if (event === 'typing' || event === 'stop-typing') {
    if (!['waiter', 'chef', 'receptionist', 'all', 'direct'].includes(data.channel)) return false;
    if (data.channel !== 'direct') return true;
    if (!isId(data.recipientId)) return false;
    const recipient = await User.findById(data.recipientId).select('company assignedProperties isActive isDeleted');
    return Boolean(recipient && recipient.isActive !== false && !recipient.isDeleted &&
      String(recipient.company) === auth.companyId && recipient.assignedProperties.some(id => String(id) === data.hotelId));
  }
  if (!isId(data.callId)) return false;
  if (event === 'acknowledge-call') return ['waiter', 'manager', 'owner', 'admin', 'hoteladmin', 'superadmin'].includes(auth.role);
  const call = await Message.findOne({ _id: data.callId, hotel: data.hotelId, messageType: 'call_request', isDeleted: false });
  if (!call) return false;
  const participants = [String(call.sender), String(call.recipient)];
  if (!participants.includes(auth.userId)) return false;
  if (event.startsWith('webrtc-')) return isId(data.targetUserId) && data.targetUserId !== auth.userId && participants.includes(data.targetUserId);
  if (event === 'end-call' && data.duration !== undefined && (!Number.isFinite(data.duration) || data.duration < 0)) return false;
  return true;
}
